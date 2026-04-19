package com.university.smartcampus.config;

import java.time.Instant;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

import com.university.smartcampus.common.dto.ApiDtos.ErrorResponse;
import com.university.smartcampus.common.exception.BadRequestException;
import com.university.smartcampus.common.exception.ConflictException;
import com.university.smartcampus.common.exception.ExternalServiceException;
import com.university.smartcampus.common.exception.ForbiddenException;
import com.university.smartcampus.common.exception.NotFoundException;
import com.university.smartcampus.common.exception.OnboardingRequiredException;
import com.university.smartcampus.common.exception.UnauthorizedException;

import jakarta.servlet.http.HttpServletRequest;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException exception,
            HttpServletRequest request) {
        String message = exception.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(FieldError::getDefaultMessage)
                .orElse("Validation failed.");

        return build(HttpStatus.BAD_REQUEST, message, request);
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ErrorResponse> handleBadRequest(BadRequestException exception, HttpServletRequest request) {
        return build(HttpStatus.BAD_REQUEST, exception.getMessage(), request);
    }

    @ExceptionHandler(MissingServletRequestPartException.class)
    public ResponseEntity<ErrorResponse> handleMissingRequestPart(MissingServletRequestPartException exception,
            HttpServletRequest request) {
        return build(HttpStatus.BAD_REQUEST, "Attachment file is required.", request);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> handleMaxUploadSize(MaxUploadSizeExceededException exception,
            HttpServletRequest request) {
        return build(HttpStatus.BAD_REQUEST, "Uploaded file is too large.", request);
    }

    @ExceptionHandler(OnboardingRequiredException.class)
    public ResponseEntity<ErrorResponse> handleOnboardingRequired(OnboardingRequiredException exception,
            HttpServletRequest request) {
        return build(
            HttpStatus.FORBIDDEN,
            exception.getMessage(),
            OnboardingRequiredException.CODE,
            request
        );
    }

    @ExceptionHandler({ ForbiddenException.class, AccessDeniedException.class })
    public ResponseEntity<ErrorResponse> handleForbidden(Exception exception, HttpServletRequest request) {
        return build(HttpStatus.FORBIDDEN, exception.getMessage(), request);
    }

    @ExceptionHandler({ UnauthorizedException.class, AuthenticationException.class })
    public ResponseEntity<ErrorResponse> handleUnauthorized(Exception exception, HttpServletRequest request) {
        return build(HttpStatus.UNAUTHORIZED, exception.getMessage(), request);
    }

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(NotFoundException exception, HttpServletRequest request) {
        return build(HttpStatus.NOT_FOUND, exception.getMessage(), request);
    }

    @ExceptionHandler(ExternalServiceException.class)
    public ResponseEntity<ErrorResponse> handleExternal(ExternalServiceException exception,
            HttpServletRequest request) {
        return build(HttpStatus.BAD_GATEWAY, exception.getMessage(), request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(Exception exception, HttpServletRequest request) {
        return build(HttpStatus.INTERNAL_SERVER_ERROR, exception.getMessage(), request);
    }

    private ResponseEntity<ErrorResponse> build(HttpStatus status, String message, HttpServletRequest request) {
        return build(status, message, null, request);
    }

    private ResponseEntity<ErrorResponse> build(HttpStatus status, String message, String code, HttpServletRequest request) {
        ErrorResponse body = new ErrorResponse(
                Instant.now(),
                status.value(),
                status.getReasonPhrase(),
                message,
                request.getRequestURI(),
                code);
        return ResponseEntity.status(status).body(body);
    }
}
