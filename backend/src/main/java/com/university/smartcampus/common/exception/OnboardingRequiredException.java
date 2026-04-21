package com.university.smartcampus.common.exception;

public class OnboardingRequiredException extends ForbiddenException {

    public static final String CODE = "ONBOARDING_REQUIRED";

    public OnboardingRequiredException(String message) {
        super(message);
    }
}
