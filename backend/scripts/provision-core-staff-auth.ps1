param(
    [Parameter(Mandatory = $true)]
    [string]$SupabaseUrl,

    [Parameter(Mandatory = $true)]
    [string]$SupabaseServiceRoleKey,

    [SecureString]$InitialPassword = (ConvertTo-SecureString "User@123" -AsPlainText -Force)
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$normalizedBaseUrl = $SupabaseUrl.TrimEnd('/')
$headers = @{
    apikey        = $SupabaseServiceRoleKey
    Authorization = "Bearer $SupabaseServiceRoleKey"
    "Content-Type" = "application/json"
}

$coreAccounts = @(
    @{ Email = "admin@teamsyncode.com"; Role = "ADMIN" },
    @{ Email = "catalog@teamsyncode.com"; Role = "CATALOG_MANAGER" },
    @{ Email = "technician@teamsyncode.com"; Role = "TICKET_MANAGER" },
    @{ Email = "booking@teamsyncode.com"; Role = "BOOKING_MANAGER" }
)

function Get-SupabaseAdminUsers {
    $uri = "$normalizedBaseUrl/auth/v1/admin/users?page=1&per_page=1000"
    $response = Invoke-RestMethod -Method Get -Uri $uri -Headers $headers

    if ($null -eq $response -or $null -eq $response.users) {
        return @()
    }

    return @($response.users)
}

function Find-SupabaseUserByEmail([object[]]$Users, [string]$Email) {
    return $Users | Where-Object {
        $candidate = $_.email
        $null -ne $candidate -and $candidate.ToString().Trim().ToLowerInvariant() -eq $Email.Trim().ToLowerInvariant()
    } | Select-Object -First 1
}

function ConvertFrom-SecureInput([SecureString]$Secret) {
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secret)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
}

function Set-SupabasePasswordIdentity([string]$Email, [SecureString]$PasswordSecure, [string]$RoleLabel) {
    $passwordPlainText = ConvertFrom-SecureInput -Secret $PasswordSecure
    $allUsers = Get-SupabaseAdminUsers
    $existingUser = Find-SupabaseUserByEmail -Users $allUsers -Email $Email

    $body = @{
        email         = $Email
        password      = $passwordPlainText
        email_confirm = $true
    } | ConvertTo-Json

    if ($null -ne $existingUser -and $null -ne $existingUser.id) {
        $updateUri = "$normalizedBaseUrl/auth/v1/admin/users/$($existingUser.id)"
        Invoke-RestMethod -Method Put -Uri $updateUri -Headers $headers -Body $body | Out-Null
        Write-Host "Updated Supabase identity for $Email ($RoleLabel)."
        return
    }

    $createUri = "$normalizedBaseUrl/auth/v1/admin/users"

    try {
        Invoke-RestMethod -Method Post -Uri $createUri -Headers $headers -Body $body | Out-Null
        Write-Host "Created Supabase identity for $Email ($RoleLabel)."
    }
    catch {
        $errorText = $_.ErrorDetails.Message
        if ($null -eq $errorText) {
            $errorText = $_.Exception.Message
        }

        if ($errorText -and $errorText.ToString().ToLowerInvariant().Contains("email_exists")) {
            $allUsers = Get-SupabaseAdminUsers
            $existingUser = Find-SupabaseUserByEmail -Users $allUsers -Email $Email

            if ($null -eq $existingUser -or $null -eq $existingUser.id) {
                throw "Supabase reported email_exists for $Email, but the user id could not be resolved."
            }

            $updateUri = "$normalizedBaseUrl/auth/v1/admin/users/$($existingUser.id)"
            Invoke-RestMethod -Method Put -Uri $updateUri -Headers $headers -Body $body | Out-Null
            Write-Host "Updated Supabase identity for $Email ($RoleLabel) after email_exists response."
            return
        }

        throw
    }
}

foreach ($account in $coreAccounts) {
    Set-SupabasePasswordIdentity -Email $account.Email -PasswordSecure $InitialPassword -RoleLabel $account.Role
}

Write-Host "Core staff Supabase password identities are provisioned successfully."
