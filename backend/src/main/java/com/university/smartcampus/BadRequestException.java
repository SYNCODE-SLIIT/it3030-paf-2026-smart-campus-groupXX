package com.university.smartcampus;

public class BadRequestException extends RuntimeException {

    public BadRequestException(String message) {
        super(message);
    }
}