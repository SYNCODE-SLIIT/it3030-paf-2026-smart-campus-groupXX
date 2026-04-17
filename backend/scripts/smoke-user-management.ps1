param(
    [string]$BaseUrl = "http://localhost:8080",
    [string]$AdminEmail = "local.admin@smartcampus.local",
    [string]$JwtSecret = "smart-campus-local-hs256-secret-for-smoke-tests-only",
    [string]$AdminPassword = "",
    [string]$SupabaseUrl = "",
    [string]$SupabaseAnonKey = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function ConvertTo-Base64Url([byte[]]$Bytes) {
    [Convert]::ToBase64String($Bytes).TrimEnd("=").Replace('+', '-').Replace('/', '_')
}

function New-HmacJwt([string]$Email, [string]$Secret) {
    $headerJson = '{"alg":"HS256","typ":"JWT"}'
    $payload = @{
        sub = [guid]::NewGuid().ToString()
        email = $Email
        iat = [int][DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
        exp = [int][DateTimeOffset]::UtcNow.AddHours(1).ToUnixTimeSeconds()
    } | ConvertTo-Json -Compress

    $header = ConvertTo-Base64Url ([System.Text.Encoding]::UTF8.GetBytes($headerJson))
    $body = ConvertTo-Base64Url ([System.Text.Encoding]::UTF8.GetBytes($payload))
    $unsignedToken = "$header.$body"

    $hmac = [System.Security.Cryptography.HMACSHA256]::new([System.Text.Encoding]::UTF8.GetBytes($Secret))
    try {
        $signature = ConvertTo-Base64Url ($hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($unsignedToken)))
    }
    finally {
        $hmac.Dispose()
    }

    return "$unsignedToken.$signature"
}

function Invoke-SmokeApi($Method, $Path, $Token, $Body = $null) {
    $headers = @{}
    if ($Token) {
        $headers.Authorization = "Bearer $Token"
    }

    $params = @{
        Method = $Method
        Uri = "$BaseUrl$Path"
        Headers = $headers
    }

    if ($Body -ne $null) {
        $params.ContentType = "application/json"
        $params.Body = ($Body | ConvertTo-Json -Depth 6)
    }

    Invoke-RestMethod @params
}

function Get-AdminToken() {
    if ($AdminPassword -and $SupabaseUrl -and $SupabaseAnonKey) {
        $login = Invoke-RestMethod -Method Post `
            -Uri "$SupabaseUrl/auth/v1/token?grant_type=password" `
            -Headers @{
                apikey = $SupabaseAnonKey
                Authorization = "Bearer $SupabaseAnonKey"
            } `
            -ContentType "application/json" `
            -Body (@{
                email = $AdminEmail
                password = $AdminPassword
            } | ConvertTo-Json)

        return $login.access_token
    }

    return New-HmacJwt -Email $AdminEmail -Secret $JwtSecret
}

$adminToken = Get-AdminToken

Write-Host "Checking backend health..."
$health = Invoke-SmokeApi -Method Get -Path "/api/health" -Token $null
Write-Host "Health response: $health"

if ($AdminPassword -and $SupabaseUrl -and $SupabaseAnonKey) {
    Write-Host "Syncing admin session..."
    $adminSync = Invoke-SmokeApi -Method Post -Path "/api/auth/session/sync" -Token $adminToken
    Write-Host "Admin next step: $($adminSync.nextStep)"
}

Write-Host "Listing current users..."
$initialUsers = Invoke-SmokeApi -Method Get -Path "/api/admin/users" -Token $adminToken
Write-Host "Current users: $($initialUsers.Count)"

Write-Host "Creating smoke manager user..."
$managerEmail = "smoke.manager.$([guid]::NewGuid().ToString('N').Substring(0, 8))@example.com"
$createResponse = Invoke-SmokeApi -Method Post -Path "/api/admin/users" -Token $adminToken -Body @{
    email = $managerEmail
    userType = "MANAGER"
    sendInvite = $true
    managerRole = "CATALOG_MANAGER"
}
Write-Host "Created user id: $($createResponse.id)"
if (-not $createResponse.lastInviteReference) {
    throw "Expected create user response to include a generated access link."
}
Write-Host "Generated access link captured."

Write-Host "Replacing manager roles..."
$updatedRole = Invoke-SmokeApi -Method Put -Path "/api/admin/users/$($createResponse.id)/manager-role" -Token $adminToken -Body @{
    managerRole = "TICKET_MANAGER"
}
Write-Host "Updated role: $($updatedRole.managerRole)"

Write-Host "Resending invite..."
$inviteResponse = Invoke-SmokeApi -Method Post -Path "/api/admin/users/$($createResponse.id)/invite" -Token $adminToken
Write-Host "Invite response: $($inviteResponse.message)"

Write-Host "Requesting public login link..."
$loginLinkResponse = Invoke-SmokeApi -Method Post -Path "/api/auth/login-link/request" -Token $null -Body @{
    email = $managerEmail
}
Write-Host "Login link response: $($loginLinkResponse.message)"

Write-Host "Creating smoke student user..."
$studentEmail = "smoke.student.$([guid]::NewGuid().ToString('N').Substring(0, 8))@example.com"
$studentResponse = Invoke-SmokeApi -Method Post -Path "/api/admin/users" -Token $adminToken -Body @{
    email = $studentEmail
    userType = "STUDENT"
    sendInvite = $false
    studentProfile = @{}
}
Write-Host "Created student id: $($studentResponse.id)"

Write-Host "Syncing student session and verifying onboarding step..."
$studentToken = New-HmacJwt -Email $studentEmail -Secret $JwtSecret
$syncResponse = Invoke-SmokeApi -Method Post -Path "/api/auth/session/sync" -Token $studentToken
if ($syncResponse.nextStep -ne "ONBOARDING") {
    throw "Expected student nextStep to be ONBOARDING but got '$($syncResponse.nextStep)'"
}
Write-Host "Student next step: $($syncResponse.nextStep)"

Write-Host "Reading onboarding state..."
$onboardingState = Invoke-SmokeApi -Method Get -Path "/api/students/me/onboarding" -Token $studentToken
Write-Host "Onboarding completed: $($onboardingState.onboardingCompleted)"

Write-Host "Completing onboarding..."
$completedStudent = Invoke-SmokeApi -Method Put -Path "/api/students/me/onboarding" -Token $studentToken -Body @{
    firstName = "Smoke"
    lastName = "Student"
    preferredName = "SS"
    phoneNumber = "0712345678"
    registrationNumber = "SMK-STU-001"
    facultyName = "FACULTY_OF_COMPUTING"
    programName = "BSC_HONS_INFORMATION_TECHNOLOGY"
    academicYear = "YEAR_2"
    semester = "SEMESTER_1"
    profileImageUrl = $null
    emailNotificationsEnabled = $true
    smsNotificationsEnabled = $false
}

if (-not $completedStudent.studentProfile.onboardingCompleted) {
    throw "Expected studentProfile.onboardingCompleted=true after onboarding submission."
}
if ($completedStudent.accountStatus -ne "ACTIVE") {
    throw "Expected student accountStatus to be ACTIVE but got '$($completedStudent.accountStatus)'"
}
Write-Host "Student onboarding completed and account activated."

Write-Host "Smoke test completed successfully."
