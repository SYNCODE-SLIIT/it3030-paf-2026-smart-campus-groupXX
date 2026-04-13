package com.university.smartcampus;

public class NotFoundException extends RuntimeException {

    public NotFoundException(String message) {
        super(message);
    }
}