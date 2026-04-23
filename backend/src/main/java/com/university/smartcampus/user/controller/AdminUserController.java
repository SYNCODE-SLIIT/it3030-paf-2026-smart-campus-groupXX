package com.university.smartcampus.user.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.university.smartcampus.auth.service.CurrentUserService;
import com.university.smartcampus.common.dto.ApiDtos.MessageResponse;
import com.university.smartcampus.common.dto.ApiDtos.UserResponse;
import com.university.smartcampus.common.enums.AppEnums.AccountStatus;
import com.university.smartcampus.common.enums.AppEnums.ManagerRole;
import com.university.smartcampus.common.enums.AppEnums.UserType;
import com.university.smartcampus.user.dto.AdminDtos.BulkStudentImportRequest;
import com.university.smartcampus.user.dto.AdminDtos.BulkStudentImportResponse;
import com.university.smartcampus.user.dto.AdminDtos.CreateUserRequest;
import com.university.smartcampus.user.dto.AdminDtos.ManagerRoleUpdateRequest;
import com.university.smartcampus.user.dto.AdminDtos.UpdateUserRequest;
import com.university.smartcampus.user.entity.UserEntity;
import com.university.smartcampus.user.service.UserManagementService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final CurrentUserService currentUserService;
    private final UserManagementService userManagementService;

    public AdminUserController(CurrentUserService currentUserService, UserManagementService userManagementService) {
        this.currentUserService = currentUserService;
        this.userManagementService = userManagementService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse createUser(@Valid @RequestBody CreateUserRequest request, Authentication authentication) {
        UserEntity admin = currentUserService.requireAdmin(authentication);
        return userManagementService.createUser(request, admin);
    }

    @PostMapping("/bulk-students/preview")
    public BulkStudentImportResponse previewBulkStudentImport(
        @Valid @RequestBody BulkStudentImportRequest request,
        Authentication authentication
    ) {
        currentUserService.requireAdmin(authentication);
        return userManagementService.previewBulkStudentImport(request);
    }

    @PostMapping("/bulk-students")
    public BulkStudentImportResponse importBulkStudents(
        @Valid @RequestBody BulkStudentImportRequest request,
        Authentication authentication
    ) {
        UserEntity admin = currentUserService.requireAdmin(authentication);
        return userManagementService.importBulkStudents(request, admin);
    }

    @GetMapping
    public List<UserResponse> listUsers(
        @RequestParam(required = false) String email,
        @RequestParam(required = false) UserType userType,
        @RequestParam(required = false) AccountStatus accountStatus,
        @RequestParam(required = false) ManagerRole managerRole,
        Authentication authentication
    ) {
        currentUserService.requireAdmin(authentication);
        return userManagementService.listUsers(email, userType, accountStatus, managerRole);
    }

    @GetMapping("/{id}")
    public UserResponse getUser(@PathVariable UUID id, Authentication authentication) {
        currentUserService.requireAdmin(authentication);
        return userManagementService.getUser(id);
    }

    @PatchMapping("/{id}")
    public UserResponse updateUser(
        @PathVariable UUID id,
        @Valid @RequestBody UpdateUserRequest request,
        Authentication authentication
    ) {
        UserEntity admin = currentUserService.requireAdmin(authentication);
        return userManagementService.updateUser(id, request, admin);
    }

    @PutMapping("/{id}/manager-role")
    public UserResponse replaceManagerRole(
        @PathVariable UUID id,
        @Valid @RequestBody ManagerRoleUpdateRequest request,
        Authentication authentication
    ) {
        UserEntity admin = currentUserService.requireAdmin(authentication);
        return userManagementService.replaceManagerRole(id, request.managerRole(), admin);
    }

    @PostMapping("/{id}/invite")
    public MessageResponse resendInvite(@PathVariable UUID id, Authentication authentication) {
        UserEntity admin = currentUserService.requireAdmin(authentication);
        return userManagementService.resendInvite(id, admin);
    }

    @DeleteMapping("/{id}")
    public MessageResponse deleteUser(@PathVariable UUID id, Authentication authentication) {
        UserEntity admin = currentUserService.requireAdmin(authentication);
        return userManagementService.deleteUser(id, admin);
    }
}
