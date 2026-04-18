package com.university.smartcampus.user.identifier;

import java.time.Instant;
import java.time.Year;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.function.Function;
import java.util.function.LongSupplier;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.university.smartcampus.common.enums.AppEnums.AcademicYear;
import com.university.smartcampus.common.enums.AppEnums.StudentProgram;
import com.university.smartcampus.common.exception.BadRequestException;
import com.university.smartcampus.user.entity.StudentEntity;
import com.university.smartcampus.user.repository.AdminRepository;
import com.university.smartcampus.user.repository.FacultyRepository;
import com.university.smartcampus.user.repository.ManagerRepository;
import com.university.smartcampus.user.repository.StudentRepository;

@Service
public class UserIdentifierService {

    private static final int MAX_INSERT_RETRIES = 4;

    private final IdentifierCounterRepository identifierCounterRepository;
    private final AdminRepository adminRepository;
    private final FacultyRepository facultyRepository;
    private final ManagerRepository managerRepository;
    private final StudentRepository studentRepository;

    public UserIdentifierService(
            IdentifierCounterRepository identifierCounterRepository,
            AdminRepository adminRepository,
            FacultyRepository facultyRepository,
            ManagerRepository managerRepository,
            StudentRepository studentRepository) {
        this.identifierCounterRepository = identifierCounterRepository;
        this.adminRepository = adminRepository;
        this.facultyRepository = facultyRepository;
        this.managerRepository = managerRepository;
        this.studentRepository = studentRepository;
    }

    @Transactional
    public String generateAdminEmployeeNumber(Instant joinInstant) {
        return generateEmployeeNumber("EMP", "ADM", joinInstant, adminRepository::findMaxEmployeeSuffix);
    }

    @Transactional
    public String generateFacultyEmployeeNumber(Instant joinInstant) {
        return generateEmployeeNumber("EMP", "FAC", joinInstant, facultyRepository::findMaxEmployeeSuffix);
    }

    @Transactional
    public String generateManagerEmployeeNumber(Instant joinInstant) {
        return generateEmployeeNumber("EMP", "MGR", joinInstant, managerRepository::findMaxEmployeeSuffix);
    }

    @Transactional
    public String generateStudentRegistrationNumber(StudentEntity student) {
        if (student.getProgramName() == null) {
            throw new BadRequestException("Program is required before generating a registration number.");
        }
        if (student.getAcademicYear() == null) {
            throw new BadRequestException("Academic year is required before generating a registration number.");
        }

        String prefix = resolveStudentProgramPrefix(student.getProgramName());
        int intakeYear = deriveIntakeYear(student.getAcademicYear());
        String prefixYear = prefix + twoDigitYear(intakeYear);

        long nextSuffix = nextSequence(
                "REG:" + prefixYear,
                () -> asNonNegative(studentRepository.findMaxRegistrationSuffix(prefixYear)));

        return prefixYear + formatSixDigits(nextSuffix);
    }

    private String generateEmployeeNumber(
            String keyNamespace,
            String rolePrefix,
            Instant joinInstant,
            Function<String, Long> existingMaxLookup) {
        int year = ZonedDateTime.ofInstant(
                joinInstant == null ? Instant.now() : joinInstant,
                ZoneOffset.UTC).getYear();
        String prefixYear = rolePrefix + twoDigitYear(year);

        long nextSuffix = nextSequence(
                keyNamespace + ":" + prefixYear,
                () -> asNonNegative(existingMaxLookup.apply(prefixYear)));

        return prefixYear + formatSixDigits(nextSuffix);
    }

    private long nextSequence(String counterKey, LongSupplier existingMaxLookup) {
        for (int attempt = 0; attempt < MAX_INSERT_RETRIES; attempt++) {
            var existingCounter = identifierCounterRepository.findForUpdate(counterKey);
            if (existingCounter.isPresent()) {
                IdentifierCounterEntity counter = existingCounter.get();
                counter.setLastValue(counter.getLastValue() + 1);
                identifierCounterRepository.saveAndFlush(counter);
                return counter.getLastValue();
            }

            long nextValue = existingMaxLookup.getAsLong() + 1;
            IdentifierCounterEntity counter = new IdentifierCounterEntity();
            counter.setCounterKey(counterKey);
            counter.setLastValue(nextValue);

            try {
                identifierCounterRepository.saveAndFlush(counter);
                return nextValue;
            } catch (DataIntegrityViolationException ignored) {
                // Another transaction inserted the same counter key first; retry with lock.
            }
        }

        throw new IllegalStateException("Unable to allocate identifier after retries for key " + counterKey);
    }

    private long asNonNegative(Long value) {
        if (value == null || value < 0) {
            return 0;
        }
        return value;
    }

    private String twoDigitYear(int year) {
        return String.format("%02d", Math.floorMod(year, 100));
    }

    private String formatSixDigits(long value) {
        if (value > 999999L) {
            throw new IllegalStateException("Identifier sequence overflowed 6 digits.");
        }
        return String.format("%06d", value);
    }

    private int deriveIntakeYear(AcademicYear academicYear) {
        int offset = switch (academicYear) {
            case YEAR_1 -> 0;
            case YEAR_2 -> 1;
            case YEAR_3 -> 2;
            case YEAR_4 -> 3;
        };

        return Year.now(ZoneOffset.UTC).getValue() - offset;
    }

    private String resolveStudentProgramPrefix(StudentProgram program) {
        return switch (program) {
            case BSC_HONS_INFORMATION_TECHNOLOGY,
                    BSC_HONS_COMPUTER_SCIENCE,
                    BSC_HONS_COMPUTER_SYSTEMS_ENGINEERING,
                    BSC_HONS_IT_ARTIFICIAL_INTELLIGENCE,
                    BSC_HONS_IT_SOFTWARE_ENGINEERING,
                    BSC_HONS_IT_COMPUTER_SYSTEMS_NETWORK_ENGINEERING,
                    BSC_HONS_IT_INFORMATION_SYSTEMS_ENGINEERING,
                    BSC_HONS_IT_CYBER_SECURITY,
                    BSC_HONS_IT_INTERACTIVE_MEDIA,
                    BSC_HONS_IT_DATA_SCIENCE -> "IT";

            case BSC_ENG_HONS_CIVIL_ENGINEERING,
                    BSC_ENG_HONS_ELECTRICAL_ELECTRONIC_ENGINEERING,
                    BSC_ENG_HONS_MECHANICAL_ENGINEERING,
                    BSC_ENG_HONS_MECHANICAL_ENGINEERING_MECHATRONICS,
                    BSC_ENG_HONS_MATERIALS_ENGINEERING -> "EN";

            case BBA_HONS_ACCOUNTING_FINANCE,
                    BBA_HONS_BUSINESS_ANALYTICS,
                    BBA_HONS_HUMAN_CAPITAL_MANAGEMENT,
                    BBA_HONS_MARKETING_MANAGEMENT,
                    BBA_HONS_LOGISTICS_SUPPLY_CHAIN_MANAGEMENT,
                    BBA_HONS_BUSINESS_MANAGEMENT,
                    BBA_HONS_MANAGEMENT_INFORMATION_SYSTEMS,
                    BBA_HONS_QUALITY_MANAGEMENT -> "BM";

            case BSC_HONS_FINANCIAL_MATHS_APPLIED_STATISTICS,
                    BSC_HONS_BIOTECHNOLOGY,
                    BA_HONS_ENGLISH_STUDIES -> "SH";

            case BSC_HONS_NURSING -> "NU";
            case BSC_HONS_PSYCHOLOGY -> "PS";
            case BED_HONS_SCIENCES_ENGLISH_SOCIAL_SCIENCES_IT -> "ED";
            case BSC_HONS_ARCHITECTURE,
                    MSC_ARCHITECTURE -> "AR";
            case BA_HONS_INTERIOR_DESIGN -> "ID";

            case ADVANCED_DIPLOMA_HOSPITALITY_MANAGEMENT,
                    ADVANCED_DIPLOMA_TRAVEL_TOURISM_MANAGEMENT,
                    DIPLOMA_EVENT_MANAGEMENT,
                    CERTIFICATE_IV_PATISSERIE,
                    COMMERCIAL_COOKERY -> "WA";

            case POSTGRADUATE_DIPLOMA_EDUCATION -> "PG";

            case MASTER_OF_EDUCATION,
                    MASTER_BUSINESS_ADMINISTRATION,
                    MSC_INFORMATION_TECHNOLOGY,
                    MSC_INFORMATION_MANAGEMENT,
                    MSC_INFORMATION_SYSTEMS,
                    MSC_NETWORK_ENGINEERING,
                    MSC_ARTIFICIAL_INTELLIGENCE -> "MS";
        };
    }
}
