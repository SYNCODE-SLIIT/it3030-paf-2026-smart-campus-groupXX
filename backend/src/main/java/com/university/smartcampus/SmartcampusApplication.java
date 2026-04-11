package com.university.smartcampus;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class SmartcampusApplication {

	public static void main(String[] args) {
		SpringApplication.run(SmartcampusApplication.class, args);
	}

}
