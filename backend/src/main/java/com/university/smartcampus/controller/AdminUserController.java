package com.university.smartcampus.controller;

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

import com.university.smartcampus.AdminDtos.CreateUserRequest;
import com.university.smartcampus.AdminDtos.ManagerRoleUpdateRequest;
import com.university.smartcampus.AdminDtos.UpdateUserRequest;
import com.university.smartcampus.ApiDtos.MessageResponse;
import com.university.smartcampus.ApiDtos.UserResponse;
import com.university.smartcampus.AppEnums.AccountStatus;
import com.university.smartcampus.AppEnums.ManagerRole;
import com.university.smartcampus.AppEnums.UserType;
import com.university.smartcampus.CurrentUserService;
import com.university.smartcampus.UserEntity;
import com.university.smartcampus.UserManagementService;

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
        currentUserService.requireAdmin(authentication);
        return userManagementService.createUser(request);
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
        currentUserService.requireAdmin(authentication);
        return userManagementService.updateUser(id, request);
    }

    @PutMapping("/{id}/manager-role")
    public UserResponse replaceManagerRole(
        @PathVariable UUID id,
        @Valid @RequestBody ManagerRoleUpdateRequest request,
        Authentication authentication
    ) {
        currentUserService.requireAdmin(authentication);
        return userManagementService.replaceManagerRole(id, request.managerRole());
    }

    @PostMapping("/{id}/invite")
    public MessageResponse resendInvite(@PathVariable UUID id, Authentication authentication) {
        currentUserService.requireAdmin(authentication);
        return userManagementService.resendInvite(id);
    }

    @DeleteMapping("/{id}")
    public MessageResponse deleteUser(@PathVariable UUID id, Authentication authentication) {
        UserEntity admin = currentUserService.requireAdmin(authentication);
        return userManagementService.deleteUser(id, admin.getId());
    }
}
