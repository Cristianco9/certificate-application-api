// ============================================================
// CERTIFICATE-APPLICATION - SEQUELIZE ASSOCIATIONS
// ============================================================
// This file defines all relationships between models.
// Import and call setupAssociations() AFTER all models are
// loaded, before the database connection is synchronized.
// ============================================================

import { Country }               from './country.js';
import { Department }            from './department.js';
import { Municipality }          from './municipality.js';

import { DocumentType }          from './documentType.js';
import { Gender }                from './gender.js';
import { AcademicLevel }         from './academicLevel.js';
import { Role }                  from './role.js';

import { User }                  from './user.js';
import { Phone }                 from './phone.js';
import { UserPhone }             from './userPhone.js';
import { StudentPhone }          from './studentPhone.js';
import { InstitutionPhone }      from './institutionPhone.js';
import { CertificateRecipientPhone } from './certificateRecipientPhone.js';

import { Student }               from './student.js';
import { Grade }                 from './grade.js';
import { Institution }           from './institution.js';
import { Subject }               from './subject.js';
import { Group }                 from './group.js';
import { Enrollment }            from './enrollment.js';
import { Score }                 from './score.js';

import { CertificateRecipient }  from './certificateRecipient.js';
import { Certificate }           from './certificate.js';
import { CertificateEnrollment } from './certificateEnrollment.js';
import { CertificateSignature }  from './certificateSignature.js';

export function setupAssociations() {

  // ============================================================
  // DEPARTMENT
  // FK: countryId (allowNull: false) -> Country
  // ============================================================

  // A country can have many departments
  Country.hasMany(Department, {
    foreignKey: 'countryId',
    sourceKey: 'id',
    as: 'departments',
  });

  // A department belongs to one country
  Department.belongsTo(Country, {
    foreignKey: 'countryId',
    targetKey: 'id',
    as: 'country',
  });

  // ============================================================
  // MUNICIPALITY
  // FK: departmentId (allowNull: false) -> Department
  // ============================================================

  // A department can have many municipalities
  Department.hasMany(Municipality, {
    foreignKey: 'departmentId',
    sourceKey: 'id',
    as: 'municipalities',
  });

  // A municipality belongs to one department
  Municipality.belongsTo(Department, {
    foreignKey: 'departmentId',
    targetKey: 'id',
    as: 'department',
  });

  // ============================================================
  // USER
  // FKs: documentTypeId, municipalityId, roleId, academicLevelId,
  //      genderId (all allowNull: false)
  // ============================================================

  // A document type can have many users
  DocumentType.hasMany(User, {
    foreignKey: 'documentTypeId',
    sourceKey: 'id',
    as: 'users',
  });

  // A user belongs to one document type
  User.belongsTo(DocumentType, {
    foreignKey: 'documentTypeId',
    targetKey: 'id',
    as: 'documentType',
  });

  // A municipality can have many users
  Municipality.hasMany(User, {
    foreignKey: 'municipalityId',
    sourceKey: 'id',
    as: 'users',
  });

  // A user belongs to one municipality
  User.belongsTo(Municipality, {
    foreignKey: 'municipalityId',
    targetKey: 'id',
    as: 'municipality',
  });

  // A role can have many users
  Role.hasMany(User, {
    foreignKey: 'roleId',
    sourceKey: 'id',
    as: 'users',
  });

  // A user belongs to one role
  User.belongsTo(Role, {
    foreignKey: 'roleId',
    targetKey: 'id',
    as: 'role',
  });

  // An academic level can have many users
  AcademicLevel.hasMany(User, {
    foreignKey: 'academicLevelId',
    sourceKey: 'id',
    as: 'users',
  });

  // A user belongs to one academic level
  User.belongsTo(AcademicLevel, {
    foreignKey: 'academicLevelId',
    targetKey: 'id',
    as: 'academicLevel',
  });

  // A gender can have many users
  Gender.hasMany(User, {
    foreignKey: 'genderId',
    sourceKey: 'id',
    as: 'users',
  });

  // A user belongs to one gender
  User.belongsTo(Gender, {
    foreignKey: 'genderId',
    targetKey: 'id',
    as: 'gender',
  });

  // ============================================================
  // STUDENT
  // FK: municipalityId (allowNull: false) -> Municipality
  // FK: documentTypeId (allowNull: true) -> DocumentType
  // FK: genderId (allowNull: true) -> Gender
  // ============================================================

  // A municipality can have many students
  Municipality.hasMany(Student, {
    foreignKey: 'municipalityId',
    sourceKey: 'id',
    as: 'students',
  });

  // A student belongs to one municipality
  Student.belongsTo(Municipality, {
    foreignKey: 'municipalityId',
    targetKey: 'id',
    as: 'municipality',
  });

  // A document type can have many students
  DocumentType.hasMany(Student, {
    foreignKey: 'documentTypeId',
    sourceKey: 'id',
    as: 'students',
  });

  // A student belongs to one document type (optional: historical students may lack one)
  Student.belongsTo(DocumentType, {
    foreignKey: 'documentTypeId',
    targetKey: 'id',
    as: 'documentType',
  });

  // A gender can have many students
  Gender.hasMany(Student, {
    foreignKey: 'genderId',
    sourceKey: 'id',
    as: 'students',
  });

  // A student belongs to one gender (optional)
  Student.belongsTo(Gender, {
    foreignKey: 'genderId',
    targetKey: 'id',
    as: 'gender',
  });

  // ============================================================
  // INSTITUTION
  // FK: municipalityId (allowNull: true) -> Municipality
  // ============================================================

  // A municipality can have many institutions
  Municipality.hasMany(Institution, {
    foreignKey: 'municipalityId',
    sourceKey: 'id',
    as: 'institutions',
  });

  // An institution belongs to one municipality (optional)
  Institution.belongsTo(Municipality, {
    foreignKey: 'municipalityId',
    targetKey: 'id',
    as: 'municipality',
  });

  // ============================================================
  // GROUP
  // FK: gradeId (allowNull: true) -> Grade
  // FK: institutionId (allowNull: true) -> Institution
  // ============================================================

  // A grade can have many groups
  Grade.hasMany(Group, {
    foreignKey: 'gradeId',
    sourceKey: 'id',
    as: 'groups',
  });

  // A group belongs to one grade (optional)
  Group.belongsTo(Grade, {
    foreignKey: 'gradeId',
    targetKey: 'id',
    as: 'grade',
  });

  // An institution can have many groups
  Institution.hasMany(Group, {
    foreignKey: 'institutionId',
    sourceKey: 'id',
    as: 'groups',
  });

  // A group belongs to one institution (optional)
  Group.belongsTo(Institution, {
    foreignKey: 'institutionId',
    targetKey: 'id',
    as: 'institution',
  });

  // ============================================================
  // ENROLLMENT
  // FK: studentId (allowNull: true) -> Student
  // FK: groupId (allowNull: true) -> Group
  // ============================================================

  // A student can have many enrollments
  Student.hasMany(Enrollment, {
    foreignKey: 'studentId',
    sourceKey: 'id',
    as: 'enrollments',
  });

  // An enrollment belongs to one student (optional)
  Enrollment.belongsTo(Student, {
    foreignKey: 'studentId',
    targetKey: 'id',
    as: 'student',
  });

  // A group can have many enrollments
  Group.hasMany(Enrollment, {
    foreignKey: 'groupId',
    sourceKey: 'id',
    as: 'enrollments',
  });

  // An enrollment belongs to one group (optional)
  Enrollment.belongsTo(Group, {
    foreignKey: 'groupId',
    targetKey: 'id',
    as: 'group',
  });

  // ============================================================
  // SCORE
  // FK: subjectId (allowNull: false) -> Subject
  // FK: enrollmentId (allowNull: false) -> Enrollment
  // ============================================================

  // A subject can have many scores
  Subject.hasMany(Score, {
    foreignKey: 'subjectId',
    sourceKey: 'id',
    as: 'scores',
  });

  // A score belongs to one subject
  Score.belongsTo(Subject, {
    foreignKey: 'subjectId',
    targetKey: 'id',
    as: 'subject',
  });

  // An enrollment can have many scores (one per subject)
  Enrollment.hasMany(Score, {
    foreignKey: 'enrollmentId',
    sourceKey: 'id',
    as: 'scores',
  });

  // A score belongs to one enrollment
  Score.belongsTo(Enrollment, {
    foreignKey: 'enrollmentId',
    targetKey: 'id',
    as: 'enrollment',
  });

  // ============================================================
  // CERTIFICATE RECIPIENT
  // FK: documentTypeId (allowNull: false) -> DocumentType
  // ============================================================

  // A document type can have many certificate recipients
  DocumentType.hasMany(CertificateRecipient, {
    foreignKey: 'documentTypeId',
    sourceKey: 'id',
    as: 'certificateRecipients',
  });

  // A certificate recipient belongs to one document type
  CertificateRecipient.belongsTo(DocumentType, {
    foreignKey: 'documentTypeId',
    targetKey: 'id',
    as: 'documentType',
  });

  // ============================================================
  // CERTIFICATE
  // FK: userId (allowNull: false) -> User
  // FK: institutionId (allowNull: false) -> Institution
  // FK: recipientId (allowNull: true) -> CertificateRecipient
  //
  // NOTE: There is no direct enrollmentId FK on 'certificado' anymore.
  // A certificate now covers ONE OR MANY enrollments through the
  // bridge table 'certificado_matricula'. See the CERTIFICATE-ENROLLMENT
  // section below.
  // ============================================================

  // A user can issue many certificates
  User.hasMany(Certificate, {
    foreignKey: 'userId',
    sourceKey: 'id',
    as: 'issuedCertificates',
  });

  // A certificate belongs to one issuing user
  Certificate.belongsTo(User, {
    foreignKey: 'userId',
    targetKey: 'id',
    as: 'issuer',
  });

  // An institution can have many certificates
  Institution.hasMany(Certificate, {
    foreignKey: 'institutionId',
    sourceKey: 'id',
    as: 'certificates',
  });

  // A certificate belongs to one institution
  Certificate.belongsTo(Institution, {
    foreignKey: 'institutionId',
    targetKey: 'id',
    as: 'institution',
  });

  // A certificate recipient can have many certificates
  CertificateRecipient.hasMany(Certificate, {
    foreignKey: 'recipientId',
    sourceKey: 'id',
    as: 'certificates',
  });

  // A certificate belongs to one recipient (optional)
  Certificate.belongsTo(CertificateRecipient, {
    foreignKey: 'recipientId',
    targetKey: 'id',
    as: 'recipient',
  });

  // ============================================================
  // CERTIFICATE ↔ ENROLLMENT (many-to-many via bridge)
  //
  // Business rules enforced by the bridge table 'certificado_matricula':
  //   • A certificate can carry MANY enrollments (one PDF, N report cards).
  //   • An enrollment can belong to AT MOST ONE certificate — enforced
  //     by the UNIQUE index on bridge.id_matricula.
  // ============================================================

  // A certificate covers many enrollments (through the junction table)
  Certificate.belongsToMany(Enrollment, {
    through: CertificateEnrollment,
    foreignKey: 'certificateId',
    otherKey: 'enrollmentId',
    as: 'enrollments',
  });

  // An enrollment belongs to at most one certificate (through the
  // junction table). In practice, per the UNIQUE rule above, an
  // enrollment is only ever linked to a single certificate record.
  Enrollment.belongsToMany(Certificate, {
    through: CertificateEnrollment,
    foreignKey: 'enrollmentId',
    otherKey: 'certificateId',
    as: 'certificates',
  });

  // Direct associations to the junction table (for eager loading / guards)
  Certificate.hasMany(CertificateEnrollment, {
    foreignKey: 'certificateId',
    sourceKey: 'id',
    as: 'certificateEnrollments',
  });
  CertificateEnrollment.belongsTo(Certificate, {
    foreignKey: 'certificateId',
    targetKey: 'id',
    as: 'certificate',
  });

  Enrollment.hasMany(CertificateEnrollment, {
    foreignKey: 'enrollmentId',
    sourceKey: 'id',
    as: 'certificateEnrollments',
  });
  CertificateEnrollment.belongsTo(Enrollment, {
    foreignKey: 'enrollmentId',
    targetKey: 'id',
    as: 'enrollment',
  });

  // ============================================================
  // CERTIFICATE SIGNATURE
  // FK: userId (allowNull: false, unique: true) -> User
  // FK: certificateId (allowNull: false) -> Certificate
  // FK: municipalityId (allowNull: false) -> Municipality
  // ============================================================

  // A user has one signature record (userId is unique: true in the model,
  // matching the business rule that only one signer record exists per user)
  User.hasOne(CertificateSignature, {
    foreignKey: 'userId',
    sourceKey: 'id',
    as: 'signature',
  });

  // A certificate signature belongs to one signer user
  CertificateSignature.belongsTo(User, {
    foreignKey: 'userId',
    targetKey: 'id',
    as: 'signer',
  });

  // A certificate can have many signatures
  Certificate.hasMany(CertificateSignature, {
    foreignKey: 'certificateId',
    sourceKey: 'id',
    as: 'signatures',
  });

  // A certificate signature belongs to one certificate
  CertificateSignature.belongsTo(Certificate, {
    foreignKey: 'certificateId',
    targetKey: 'id',
    as: 'certificate',
  });

  // A municipality can have many certificate signatures
  Municipality.hasMany(CertificateSignature, {
    foreignKey: 'municipalityId',
    sourceKey: 'id',
    as: 'certificateSignatures',
  });

  // A certificate signature belongs to one municipality
  CertificateSignature.belongsTo(Municipality, {
    foreignKey: 'municipalityId',
    targetKey: 'id',
    as: 'municipality',
  });

  // ============================================================
  // PHONES (many-to-many via dedicated bridge tables)
  // Business rule: each actor (User, Student, Institution,
  // CertificateRecipient) can have multiple phones, but a given phone
  // belongs to exactly one actor. This ownership rule is NOT expressed
  // by the many-to-many shape itself (which would technically allow
  // the same phone to be shared), but is enforced procedurally at the
  // service layer: a Phone row must only ever be linked through ONE
  // of the four bridge tables below, never more than one, for a given
  // phone id.
  // ============================================================

  // A user has many phones (through the junction table)
  User.belongsToMany(Phone, {
    through: UserPhone,
    foreignKey: 'userId',
    otherKey: 'phoneId',
    as: 'phones',
  });

  // A phone can belong to many users (through the junction table).
  // In practice, per the ownership rule above, a phone is only ever
  // linked to a single user record.
  Phone.belongsToMany(User, {
    through: UserPhone,
    foreignKey: 'phoneId',
    otherKey: 'userId',
    as: 'users',
  });

  // Direct associations to the junction table (for eager loading details)
  User.hasMany(UserPhone, {
    foreignKey: 'userId',
    sourceKey: 'id',
    as: 'userPhones',
  });
  UserPhone.belongsTo(User, {
    foreignKey: 'userId',
    targetKey: 'id',
    as: 'user',
  });

  Phone.hasMany(UserPhone, {
    foreignKey: 'phoneId',
    sourceKey: 'id',
    as: 'userPhones',
  });
  UserPhone.belongsTo(Phone, {
    foreignKey: 'phoneId',
    targetKey: 'id',
    as: 'phone',
  });

  // A student has many phones (through the junction table)
  Student.belongsToMany(Phone, {
    through: StudentPhone,
    foreignKey: 'studentId',
    otherKey: 'phoneId',
    as: 'phones',
  });

  // A phone can belong to many students (through the junction table).
  // In practice, per the ownership rule above, a phone is only ever
  // linked to a single student record.
  Phone.belongsToMany(Student, {
    through: StudentPhone,
    foreignKey: 'phoneId',
    otherKey: 'studentId',
    as: 'students',
  });

  // Direct associations to the junction table
  Student.hasMany(StudentPhone, {
    foreignKey: 'studentId',
    sourceKey: 'id',
    as: 'studentPhones',
  });
  StudentPhone.belongsTo(Student, {
    foreignKey: 'studentId',
    targetKey: 'id',
    as: 'student',
  });

  Phone.hasMany(StudentPhone, {
    foreignKey: 'phoneId',
    sourceKey: 'id',
    as: 'studentPhones',
  });
  StudentPhone.belongsTo(Phone, {
    foreignKey: 'phoneId',
    targetKey: 'id',
    as: 'phone',
  });

  // An institution has many phones (through the junction table)
  Institution.belongsToMany(Phone, {
    through: InstitutionPhone,
    foreignKey: 'institutionId',
    otherKey: 'phoneId',
    as: 'phones',
  });

  // A phone can belong to many institutions (through the junction table).
  // In practice, per the ownership rule above, a phone is only ever
  // linked to a single institution record.
  Phone.belongsToMany(Institution, {
    through: InstitutionPhone,
    foreignKey: 'phoneId',
    otherKey: 'institutionId',
    as: 'institutions',
  });

  // Direct associations to the junction table
  Institution.hasMany(InstitutionPhone, {
    foreignKey: 'institutionId',
    sourceKey: 'id',
    as: 'institutionPhones',
  });
  InstitutionPhone.belongsTo(Institution, {
    foreignKey: 'institutionId',
    targetKey: 'id',
    as: 'institution',
  });

  Phone.hasMany(InstitutionPhone, {
    foreignKey: 'phoneId',
    sourceKey: 'id',
    as: 'institutionPhones',
  });
  InstitutionPhone.belongsTo(Phone, {
    foreignKey: 'phoneId',
    targetKey: 'id',
    as: 'phone',
  });

  // A certificate recipient has many phones (through the junction table)
  CertificateRecipient.belongsToMany(Phone, {
    through: CertificateRecipientPhone,
    foreignKey: 'certificateRecipientId',
    otherKey: 'phoneId',
    as: 'phones',
  });

  // A phone can belong to many certificate recipients (through the
  // junction table). In practice, per the ownership rule above, a
  // phone is only ever linked to a single certificate recipient record.
  Phone.belongsToMany(CertificateRecipient, {
    through: CertificateRecipientPhone,
    foreignKey: 'phoneId',
    otherKey: 'certificateRecipientId',
    as: 'certificateRecipients',
  });

  // Direct associations to the junction table
  CertificateRecipient.hasMany(CertificateRecipientPhone, {
    foreignKey: 'certificateRecipientId',
    sourceKey: 'id',
    as: 'certificateRecipientPhones',
  });
  CertificateRecipientPhone.belongsTo(CertificateRecipient, {
    foreignKey: 'certificateRecipientId',
    targetKey: 'id',
    as: 'certificateRecipient',
  });

  Phone.hasMany(CertificateRecipientPhone, {
    foreignKey: 'phoneId',
    sourceKey: 'id',
    as: 'certificateRecipientPhones',
  });
  CertificateRecipientPhone.belongsTo(Phone, {
    foreignKey: 'phoneId',
    targetKey: 'id',
    as: 'phone',
  });

}
