import type { AcademicYear, Semester, StudentFaculty, StudentProgram } from '@/lib/api-types';

export const facultyOptions: Array<{ value: StudentFaculty; label: string }> = [
  { value: 'FACULTY_OF_COMPUTING', label: 'Faculty of Computing' },
  { value: 'FACULTY_OF_ENGINEERING', label: 'Faculty of Engineering' },
  { value: 'SLIIT_BUSINESS_SCHOOL', label: 'SLIIT Business School' },
  { value: 'FACULTY_OF_HUMANITIES_AND_SCIENCES', label: 'Faculty of Humanities & Sciences' },
  { value: 'SCHOOL_OF_ARCHITECTURE', label: 'School of Architecture' },
  { value: 'WILLIAM_ANGLISS_AT_SLIIT', label: 'William Angliss @ SLIIT' },
  { value: 'FACULTY_OF_GRADUATE_STUDIES_AND_RESEARCH', label: 'Faculty of Graduate Studies & Research' },
];

export const programOptionsByFaculty: Record<StudentFaculty, Array<{ value: StudentProgram; label: string }>> = {
  FACULTY_OF_COMPUTING: [
    { value: 'BSC_HONS_INFORMATION_TECHNOLOGY', label: 'BSc (Hons) in Information Technology' },
    { value: 'BSC_HONS_COMPUTER_SCIENCE', label: 'BSc (Hons) in Computer Science' },
    { value: 'BSC_HONS_COMPUTER_SYSTEMS_ENGINEERING', label: 'BSc (Hons) in Computer Systems Engineering' },
    { value: 'BSC_HONS_IT_ARTIFICIAL_INTELLIGENCE', label: 'BSc (Hons) in Information Technology - Artificial Intelligence' },
    { value: 'BSC_HONS_IT_SOFTWARE_ENGINEERING', label: 'BSc (Hons) in Information Technology - Software Engineering' },
    { value: 'BSC_HONS_IT_COMPUTER_SYSTEMS_NETWORK_ENGINEERING', label: 'BSc (Hons) in Information Technology - Computer Systems & Network Engineering' },
    { value: 'BSC_HONS_IT_INFORMATION_SYSTEMS_ENGINEERING', label: 'BSc (Hons) in Information Technology - Information Systems Engineering' },
    { value: 'BSC_HONS_IT_CYBER_SECURITY', label: 'BSc (Hons) in Information Technology - Cyber Security' },
    { value: 'BSC_HONS_IT_INTERACTIVE_MEDIA', label: 'BSc (Hons) in Information Technology - Interactive Media' },
    { value: 'BSC_HONS_IT_DATA_SCIENCE', label: 'BSc (Hons) in Information Technology - Data Science' },
  ],
  FACULTY_OF_ENGINEERING: [
    { value: 'BSC_ENG_HONS_CIVIL_ENGINEERING', label: 'BSc Engineering (Hons) in Civil Engineering' },
    { value: 'BSC_ENG_HONS_ELECTRICAL_ELECTRONIC_ENGINEERING', label: 'BSc Engineering (Hons) in Electrical & Electronic Engineering' },
    { value: 'BSC_ENG_HONS_MECHANICAL_ENGINEERING', label: 'BSc Engineering (Hons) in Mechanical Engineering' },
    { value: 'BSC_ENG_HONS_MECHANICAL_ENGINEERING_MECHATRONICS', label: 'BSc Engineering (Hons) in Mechanical Engineering (Mechatronics Specialisation)' },
    { value: 'BSC_ENG_HONS_MATERIALS_ENGINEERING', label: 'BSc Engineering (Hons) in Materials Engineering' },
  ],
  SLIIT_BUSINESS_SCHOOL: [
    { value: 'BBA_HONS_ACCOUNTING_FINANCE', label: 'BBA (Hons) in Accounting & Finance' },
    { value: 'BBA_HONS_BUSINESS_ANALYTICS', label: 'BBA (Hons) in Business Analytics' },
    { value: 'BBA_HONS_HUMAN_CAPITAL_MANAGEMENT', label: 'BBA (Hons) in Human Capital Management' },
    { value: 'BBA_HONS_MARKETING_MANAGEMENT', label: 'BBA (Hons) in Marketing Management' },
    { value: 'BBA_HONS_LOGISTICS_SUPPLY_CHAIN_MANAGEMENT', label: 'BBA (Hons) in Logistics & Supply Chain Management' },
    { value: 'BBA_HONS_BUSINESS_MANAGEMENT', label: 'BBA (Hons) in Business Management' },
    { value: 'BBA_HONS_MANAGEMENT_INFORMATION_SYSTEMS', label: 'BBA (Hons) in Management Information Systems' },
    { value: 'BBA_HONS_QUALITY_MANAGEMENT', label: 'BBA (Hons) in Quality Management' },
  ],
  FACULTY_OF_HUMANITIES_AND_SCIENCES: [
    { value: 'BSC_HONS_FINANCIAL_MATHS_APPLIED_STATISTICS', label: 'BSc (Hons) in Financial Mathematics and Applied Statistics' },
    { value: 'BSC_HONS_BIOTECHNOLOGY', label: 'BSc (Hons) in Biotechnology' },
    { value: 'BSC_HONS_PSYCHOLOGY', label: 'BSc (Hons) Psychology' },
    { value: 'BSC_HONS_NURSING', label: 'BSc (Hons) Nursing' },
    { value: 'BA_HONS_ENGLISH_STUDIES', label: 'BA (Hons) in English Studies' },
    { value: 'BED_HONS_SCIENCES_ENGLISH_SOCIAL_SCIENCES_IT', label: 'BEd (Hons) in Biological Sciences, English, Physical Sciences, Social Sciences, and Information Technology' },
  ],
  SCHOOL_OF_ARCHITECTURE: [
    { value: 'BSC_HONS_ARCHITECTURE', label: 'BSc (Hons) Architecture' },
    { value: 'BA_HONS_INTERIOR_DESIGN', label: 'BA (Hons) Interior Design' },
    { value: 'MSC_ARCHITECTURE', label: 'MSc Architecture' },
  ],
  WILLIAM_ANGLISS_AT_SLIIT: [
    { value: 'ADVANCED_DIPLOMA_HOSPITALITY_MANAGEMENT', label: 'Advanced Diploma in Hospitality Management' },
    { value: 'ADVANCED_DIPLOMA_TRAVEL_TOURISM_MANAGEMENT', label: 'Advanced Diploma in Travel and Tourism Management' },
    { value: 'DIPLOMA_EVENT_MANAGEMENT', label: 'Diploma in Event Management' },
    { value: 'CERTIFICATE_IV_PATISSERIE', label: 'Certificate IV in Patisserie' },
    { value: 'COMMERCIAL_COOKERY', label: 'Commercial Cookery' },
  ],
  FACULTY_OF_GRADUATE_STUDIES_AND_RESEARCH: [
    { value: 'POSTGRADUATE_DIPLOMA_EDUCATION', label: 'Postgraduate Diploma in Education' },
    { value: 'MASTER_OF_EDUCATION', label: 'Master of Education (MEd)' },
    { value: 'MASTER_BUSINESS_ADMINISTRATION', label: 'Master of Business Administration (MBA)' },
    { value: 'MSC_INFORMATION_TECHNOLOGY', label: 'MSc in Information Technology' },
    { value: 'MSC_INFORMATION_MANAGEMENT', label: 'MSc in Information Management' },
    { value: 'MSC_INFORMATION_SYSTEMS', label: 'MSc in Information Systems' },
    { value: 'MSC_NETWORK_ENGINEERING', label: 'MSc in Network Engineering' },
    { value: 'MSC_ARTIFICIAL_INTELLIGENCE', label: 'MSc in Artificial Intelligence' },
  ],
};

export const academicYearOptions: Array<{ value: AcademicYear; label: string }> = [
  { value: 'YEAR_1', label: 'Year 1' },
  { value: 'YEAR_2', label: 'Year 2' },
  { value: 'YEAR_3', label: 'Year 3' },
  { value: 'YEAR_4', label: 'Year 4' },
];

export const semesterOptions: Array<{ value: Semester; label: string }> = [
  { value: 'SEMESTER_1', label: 'Semester 1' },
  { value: 'SEMESTER_2', label: 'Semester 2' },
];

export function getStudentFacultyLabel(faculty: StudentFaculty | null | undefined) {
  return facultyOptions.find((option) => option.value === faculty)?.label ?? faculty ?? '';
}

export function getStudentProgramLabel(program: StudentProgram | null | undefined) {
  return Object.values(programOptionsByFaculty)
    .flat()
    .find((option) => option.value === program)?.label ?? program ?? '';
}

export function programBelongsToFaculty(program: StudentProgram, faculty: StudentFaculty) {
  return programOptionsByFaculty[faculty].some((option) => option.value === program);
}
