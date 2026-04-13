package com.university.smartcampus;

import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.university.smartcampus.AdminDtos.AdminProfileInput;
import com.university.smartcampus.AdminDtos.CreateUserRequest;
import com.university.smartcampus.AdminDtos.FacultyProfileInput;
import com.university.smartcampus.AdminDtos.ManagerProfileInput;
import com.university.smartcampus.AdminDtos.UpdateUserRequest;
import com.university.smartcampus.ApiDtos.MessageResponse;
import com.university.smartcampus.ApiDtos.UserResponse;
import com.university.smartcampus.AppEnums.AccountStatus;
import com.university.smartcampus.AppEnums.AuthDeliveryMethod;
import com.university.smartcampus.AppEnums.ManagerRole;
import com.university.smartcampus.AppEnums.UserType;
import com.university.smartcampus.AuthDtos.SessionSyncResponse;
import com.university.smartcampus.BadRequestException;
import com.university.smartcampus.ForbiddenException;
import com.university.smartcampus.NotFoundException;
import com.university.smartcampus.StudentDtos.StudentOnboardingRequest;
import com.university.smartcampus.StudentDtos.StudentOnboardingStateResponse;

@Service
public class UserManagementService {

    private static final String NEXT_STEP_DASHBOARD = "DASHBOARD";
    private static final String NEXT_STEP_ONBOARDING = "ONBOARDING";

    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final ManagerRepository managerRepository;
    private final AuthProviderClient authProviderClient;
    private final AuthIdentityClient authIdentityClient;
    private final UserMapper userMapper;
    private final CurrentUserService currentUserService;

    public UserManagementService(
        UserRepository userRepository,
        StudentRepository studentRepository,
        ManagerRepository managerRepository,
        AuthProviderClient authProviderClient,
        AuthIdentityClient authIdentityClient,
        UserMapper userMapper,
        CurrentUserService currentUserService
    ) {
        this.userRepository = userRepository;
        this.studentRepository = studentRepository;
        this.managerRepository = managerRepository;
        this.authProviderClient = authProviderClient;
        this.authIdentityClient = authIdentityClient;
        this.userMapper = userMapper;
        this.currentUserService = currentUserService;
    }

    @Transactional
    public UserResponse createUser(CreateUserRequest request) {
        String email = currentUserService.normalizeEmail(request.email());
        if (!StringUtils.hasText(email)) {
            throw new BadRequestException("Email is required.");
        }
        if (userRepository.findByEmailIgnoreCase(email).isPresent()) {
            throw new BadRequestException("A user with this email already exists.");
        }

        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setEmail(email);
        user.setUserType(request.userType());
        user.setAccountStatus(AccountStatus.INVITED);
        user.setInvitedAt(Instant.now());

        attachProfileForCreate(user, request);
        userRepository.save(user);

        if (request.sendInvite()) {
            recordDelivery(user, authProviderClient.sendInviteLink(user.getEmail()));
        }

        return userMapper.toUserResponse(user);
    }

    @Transactional(readOnly = true)
    public List<UserResponse> listUsers(
        String email,
        UserType userType,
        AccountStatus accountStatus,
        ManagerRole managerRole
    ) {
        Specification<UserEntity> specification = (root, query, cb) -> cb.conjunction();

        if (StringUtils.hasText(email)) {
            String normalizedEmail = currentUserService.normalizeEmail(email);
            specification = specification.and((root, query, cb) ->
                cb.like(cb.lower(root.get("email")), "%" + normalizedEmail + "%"));
        }

        if (userType != null) {
            specification = specification.and((root, query, cb) -> cb.equal(root.get("userType"), userType));
        }

        if (accountStatus != null) {
            specification = specification.and((root, query, cb) -> cb.equal(root.get("accountStatus"), accountStatus));
        }

        return userRepository.findAll(specification, Sort.by(Sort.Direction.ASC, "email")).stream()
            .filter(user -> managerRole == null || hasManagerRole(user, managerRole))
            .map(userMapper::toUserResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public UserResponse getUser(UUID id) {
        return userMapper.toUserResponse(getUserEntity(id));
    }

    @Transactional
    public UserResponse updateUser(UUID id, UpdateUserRequest request) {
        UserEntity user = getUserEntity(id);

        if (request.accountStatus() != null) {
            user.setAccountStatus(request.accountStatus());
            if (request.accountStatus() == AccountStatus.ACTIVE && user.getActivatedAt() == null) {
                user.setActivatedAt(Instant.now());
            }
        }

        switch (user.getUserType()) {
            case STUDENT -> validateNoUnexpectedProfiles(request);
            case FACULTY -> updateFacultyProfile(user, request.facultyProfile());
            case ADMIN -> updateAdminProfile(user, request.adminProfile());
            case MANAGER -> updateManagerProfile(user, request.managerProfile());
        }

        return userMapper.toUserResponse(user);
    }

    @Transactional
    public UserResponse replaceManagerRoles(UUID id, Set<ManagerRole> managerRoles) {
        if (managerRoles == null || managerRoles.isEmpty()) {
            throw new BadRequestException("Managers must have at least one manager role.");
        }

        UserEntity user = getUserEntity(id);
        if (user.getUserType() != UserType.MANAGER || user.getManagerProfile() == null) {
            throw new BadRequestException("Manager roles can only be assigned to manager users.");
        }

        ManagerEntity manager = user.getManagerProfile();
        manager.setManagerRoles(managerRoles);
        managerRepository.save(manager);

        return userMapper.toUserResponse(user);
    }

    @Transactional
    public MessageResponse resendInvite(UUID id) {
        UserEntity user = getUserEntity(id);
        if (user.getAccountStatus() == AccountStatus.SUSPENDED) {
            throw new BadRequestException("Suspended users cannot receive login links.");
        }

        AuthProviderClient.DeliveryResult delivery = user.getAccountStatus() == AccountStatus.INVITED
            ? authProviderClient.sendInviteLink(user.getEmail())
            : authProviderClient.sendMagicLink(user.getEmail());

        recordDelivery(user, delivery);
        return new MessageResponse("Access link generated.");
    }

    @Transactional
    public MessageResponse requestLoginLink(String email) {
        if (StringUtils.hasText(email)) {
            String normalizedEmail = currentUserService.normalizeEmail(email);
            userRepository.findByEmailIgnoreCase(normalizedEmail)
                .filter(user -> user.getAccountStatus() != AccountStatus.SUSPENDED)
                .ifPresent(user -> recordDelivery(user, authProviderClient.sendMagicLink(user.getEmail())));
        }

        return new MessageResponse("If the account exists, an access link has been generated.");
    }

    @Transactional
    public MessageResponse deleteUser(UUID id, UUID requestingAdminId) {
        UserEntity user = getUserEntity(id);

        if (user.getId().equals(requestingAdminId)) {
            throw new BadRequestException("You cannot delete your own admin account.");
        }

        authIdentityClient.deleteIdentity(user.getAuthUserId(), user.getEmail());
        userRepository.delete(user);
        userRepository.flush();

        return new MessageResponse("User deleted.");
    }

    @Transactional
    public SessionSyncResponse syncSession(Jwt jwt) {
        String email = currentUserService.normalizedEmailFromJwt(jwt);
        UUID subject = currentUserService.subjectFromJwt(jwt);

        UserEntity user = userRepository.findByEmailIgnoreCase(email)
            .orElseThrow(() -> new ForbiddenException("This authenticated account has not been provisioned."));

        if (user.getAccountStatus() == AccountStatus.SUSPENDED) {
            throw new ForbiddenException("This account is suspended.");
        }

        if (user.getAuthUserId() == null || !Objects.equals(user.getAuthUserId(), subject)) {
            user.setAuthUserId(subject);
        }

        user.setLastLoginAt(Instant.now());
        if (user.getUserType() != UserType.STUDENT && user.getAccountStatus() == AccountStatus.INVITED) {
            user.setAccountStatus(AccountStatus.ACTIVE);
            if (user.getActivatedAt() == null) {
                user.setActivatedAt(Instant.now());
            }
        }

        return new SessionSyncResponse(userMapper.toUserResponse(user), nextStep(user));
    }

    @Transactional(readOnly = true)
    public UserResponse currentUser(UserEntity user) {
        return userMapper.toUserResponse(user);
    }

    @Transactional(readOnly = true)
    public StudentOnboardingStateResponse getStudentOnboarding(UserEntity user) {
        ensureStudent(user);
        return new StudentOnboardingStateResponse(
            user.getStudentProfile() != null && user.getStudentProfile().isOnboardingCompleted(),
            userMapper.toStudentProfile(user.getStudentProfile())
        );
    }

    @Transactional
    public UserResponse completeStudentOnboarding(UserEntity user, StudentOnboardingRequest request) {
        UserEntity managedUser = getUserEntity(user.getId());
        ensureStudent(managedUser);

        StudentEntity student = managedUser.getStudentProfile();
        if (student == null) {
            throw new NotFoundException("Student profile was not found for this user.");
        }

        student.setFirstName(request.firstName());
        student.setLastName(request.lastName());
        student.setPreferredName(request.preferredName());
        student.setPhoneNumber(request.phoneNumber());
        student.setRegistrationNumber(request.registrationNumber());
        student.setFacultyName(request.facultyName());
        student.setProgramName(request.programName());
        student.setAcademicYear(request.academicYear());
        student.setSemester(request.semester());
        student.setProfileImageUrl(request.profileImageUrl());
        student.setEmailNotificationsEnabled(defaultBoolean(request.emailNotificationsEnabled(), Boolean.TRUE));
        student.setSmsNotificationsEnabled(defaultBoolean(request.smsNotificationsEnabled(), Boolean.FALSE));

        student.setOnboardingCompleted(true);
        if (managedUser.getAccountStatus() == AccountStatus.INVITED) {
            managedUser.setAccountStatus(AccountStatus.ACTIVE);
        }
        if (managedUser.getActivatedAt() == null) {
            managedUser.setActivatedAt(Instant.now());
        }

        studentRepository.save(student);
        userRepository.save(managedUser);
        return userMapper.toUserResponse(managedUser);
    }

    private void attachProfileForCreate(UserEntity user, CreateUserRequest request) {
        ensureProfileCombinationsForCreate(request);

        switch (request.userType()) {
            case STUDENT -> user.setStudentProfile(createStudentProfile(user));
            case FACULTY -> user.setFacultyProfile(createFacultyProfile(user, request.facultyProfile()));
            case ADMIN -> user.setAdminProfile(createAdminProfile(user, request.adminProfile()));
            case MANAGER -> user.setManagerProfile(createManagerProfile(user, request.managerProfile(), request.managerRoles()));
        }
    }

    private void ensureProfileCombinationsForCreate(CreateUserRequest request) {
        if (request.userType() != UserType.MANAGER && request.managerRoles() != null && !request.managerRoles().isEmpty()) {
            throw new BadRequestException("Manager roles can only be assigned to manager users.");
        }

        switch (request.userType()) {
            case STUDENT -> {
                if (request.facultyProfile() != null || request.adminProfile() != null || request.managerProfile() != null) {
                    throw new BadRequestException("Student creation does not accept non-student profile payloads.");
                }
            }
            case FACULTY -> require(request.adminProfile() == null && request.managerProfile() == null,
                "Faculty creation does not accept admin or manager profile payloads.");
            case ADMIN -> require(request.facultyProfile() == null && request.managerProfile() == null,
                "Admin creation does not accept faculty or manager profile payloads.");
            case MANAGER -> {
                require(request.facultyProfile() == null && request.adminProfile() == null,
                    "Manager creation does not accept faculty or admin profile payloads.");
                require(request.managerRoles() != null && !request.managerRoles().isEmpty(),
                    "Managers must have at least one manager role.");
            }
        }
    }

    private void validateNoUnexpectedProfiles(UpdateUserRequest request) {
        if (request.facultyProfile() != null || request.adminProfile() != null || request.managerProfile() != null) {
            throw new BadRequestException("Student updates do not accept non-student profile payloads.");
        }
    }

    private StudentEntity createStudentProfile(UserEntity user) {
        StudentEntity student = new StudentEntity();
        student.setUser(user);
        student.setOnboardingCompleted(false);
        user.setStudentProfile(student);
        return student;
    }

    private FacultyEntity createFacultyProfile(UserEntity user, FacultyProfileInput input) {
        FacultyEntity faculty = new FacultyEntity();
        faculty.setUser(user);
        if (input != null) {
            applyFacultyProfile(faculty, input);
        }
        user.setFacultyProfile(faculty);
        return faculty;
    }

    private AdminEntity createAdminProfile(UserEntity user, AdminProfileInput input) {
        AdminEntity admin = new AdminEntity();
        admin.setUser(user);
        if (input != null) {
            applyAdminProfile(admin, input);
        }
        user.setAdminProfile(admin);
        return admin;
    }

    private ManagerEntity createManagerProfile(UserEntity user, ManagerProfileInput input, Set<ManagerRole> managerRoles) {
        ManagerEntity manager = new ManagerEntity();
        manager.setUser(user);
        if (input != null) {
            applyManagerProfile(manager, input);
        }
        manager.setManagerRoles(managerRoles);
        user.setManagerProfile(manager);
        return manager;
    }

    private void updateFacultyProfile(UserEntity user, FacultyProfileInput input) {
        if (input != null) {
            applyFacultyProfile(user.getFacultyProfile(), input);
        }
    }

    private void updateAdminProfile(UserEntity user, AdminProfileInput input) {
        if (input != null) {
            applyAdminProfile(user.getAdminProfile(), input);
        }
    }

    private void updateManagerProfile(UserEntity user, ManagerProfileInput input) {
        if (input != null) {
            applyManagerProfile(user.getManagerProfile(), input);
        }
    }

    private void applyFacultyProfile(FacultyEntity faculty, FacultyProfileInput input) {
        faculty.setFirstName(input.firstName());
        faculty.setLastName(input.lastName());
        faculty.setPreferredName(input.preferredName());
        faculty.setPhoneNumber(input.phoneNumber());
        faculty.setEmployeeNumber(input.employeeNumber());
        faculty.setDepartment(input.department());
        faculty.setDesignation(input.designation());
        faculty.setOfficeLocation(input.officeLocation());
        faculty.setOfficePhone(input.officePhone());
    }

    private void applyAdminProfile(AdminEntity admin, AdminProfileInput input) {
        admin.setFirstName(input.firstName());
        admin.setLastName(input.lastName());
        admin.setPreferredName(input.preferredName());
        admin.setPhoneNumber(input.phoneNumber());
        admin.setEmployeeNumber(input.employeeNumber());
        admin.setDepartment(input.department());
        admin.setJobTitle(input.jobTitle());
        admin.setOfficePhone(input.officePhone());
    }

    private void applyManagerProfile(ManagerEntity manager, ManagerProfileInput input) {
        manager.setFirstName(input.firstName());
        manager.setLastName(input.lastName());
        manager.setPreferredName(input.preferredName());
        manager.setPhoneNumber(input.phoneNumber());
        manager.setEmployeeNumber(input.employeeNumber());
        manager.setDepartment(input.department());
        manager.setJobTitle(input.jobTitle());
        manager.setOfficeLocation(input.officeLocation());
    }

    private UserEntity getUserEntity(UUID id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("User not found."));
    }

    private void ensureStudent(UserEntity user) {
        if (user.getUserType() != UserType.STUDENT) {
            throw new ForbiddenException("Only students can access onboarding.");
        }
        if (user.getAccountStatus() == AccountStatus.SUSPENDED) {
            throw new ForbiddenException("This account is suspended.");
        }
    }

    private void recordDelivery(UserEntity user, AuthProviderClient.DeliveryResult deliveryResult) {
        user.setLastInviteSentAt(Instant.now());
        user.setInviteSendCount(user.getInviteSendCount() + 1);
        user.setLastInviteMethod(deliveryResult.deliveryMethod());
        user.setLastInviteReference(deliveryResult.authReference());
        user.setLastInviteRedirectUri(deliveryResult.redirectUri());
        userRepository.flush();
    }

    private String nextStep(UserEntity user) {
        return user.getUserType() == UserType.STUDENT && !user.isOnboardingCompleted()
            ? NEXT_STEP_ONBOARDING
            : NEXT_STEP_DASHBOARD;
    }

    private boolean hasManagerRole(UserEntity user, ManagerRole managerRole) {
        return user.getManagerProfile() != null && user.getManagerProfile().hasManagerRole(managerRole);
    }

    private void require(boolean condition, String message) {
        if (!condition) {
            throw new BadRequestException(message);
        }
    }

    private Boolean defaultBoolean(Boolean value, Boolean defaultValue) {
        return value != null ? value : defaultValue;
    }
}
