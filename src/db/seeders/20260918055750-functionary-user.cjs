'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    if (process.env.NODE_ENV === 'production') {
      console.log('Skipping secretario user seed in production environment.');
      return;
    }

    // ── 1. Catalog lookups (specific rows, not "first available") ────────
    //
    // The `rol` ENUM has no 'Secretario' value — the five roles are
    // Máster, Auxiliar, Administrador, Secretario, Rector. "Secretario"
    // is the display title the certificate renders for a Secretario
    // (see SignatureView in CertificateDocument.tsx), not a role.
    // So the row is seeded with role 'Secretario'.

    const [roles] = await queryInterface.sequelize.query(
      `SELECT id_rol FROM rol WHERE nombre_rol = 'Secretario' LIMIT 1;`
    );

    // c.c  →  Cédula de Ciudadanía
    const [documentTypes] = await queryInterface.sequelize.query(
      `SELECT id_tipo_documento
         FROM tipo_documento
        WHERE nombre_tipodocumento = 'Cédula de Ciudadanía'
        LIMIT 1;`
    );

    // Otoniel → Masculino
    const [genders] = await queryInterface.sequelize.query(
      `SELECT id_genero
         FROM genero
        WHERE nombre_genero = 'Masculino'
        LIMIT 1;`
    );

    // Realistic academic level for a school academic secretary.
    // NOTE: this is an assumption — if his actual academic level is
    // different, change only this string. Valid values per the ENUM are:
    // 'Técnico', 'tecnólogo', 'Licenciado', 'Especialista', 'Maestría',
    // 'Doctorado', 'Post-Doctorado'.
    const [academicLevels] = await queryInterface.sequelize.query(
      `SELECT id_nivel_academico
         FROM nivel_academico
        WHERE nombre_nivel_academico = 'Licenciado'
        LIMIT 1;`
    );

    // Roldanillo is not unique across Colombia on its own — join to
    // departamento to disambiguate, mirroring the "de Roldanillo - Valle"
    // on the C.C. The user wrote "Valle" colloquially; the department
    // table stores it as "Valle del Cauca".
    const [municipalities] = await queryInterface.sequelize.query(
      `SELECT m.id_municipio
         FROM municipio m
         JOIN departamento d ON m.id_departamento = d.id_departamento
        WHERE m.nombre_municipio = 'Roldanillo'
          AND d.nombre_departamento = 'Valle del Cauca'
        LIMIT 1;`
    );

    const roleId = roles[0]?.id_rol;
    const documentTypeId = documentTypes[0]?.id_tipo_documento;
    const genderId = genders[0]?.id_genero;
    const academicLevelId = academicLevels[0]?.id_nivel_academico;
    const municipalityId = municipalities[0]?.id_municipio;

    if (
      !roleId ||
      !documentTypeId ||
      !genderId ||
      !academicLevelId ||
      !municipalityId
    ) {
      throw new Error(
        'Cannot seed secretario user: one or more required catalog ' +
          'records (role "Secretario", document type "Cédula de ' +
          'Ciudadanía", gender "Masculino", academic level ' +
          '"Licenciado", or municipality "Roldanillo" in "Valle del ' +
          'Cauca") were not found. Make sure all catalog seeders have ' +
          'run before this one.'
      );
    }

    // ── 2. Pre-hashed password (MasterPassword123) ───────────────────────
    const rawPassword =
      '$2b$11$H8f5L428VEQycm0ZEJIF4.S6MQsDC7MAcV28X.p9h0WYMttiM6wQ6';

    // ── 3. Insert the secretario user ────────────────────────────────────
    //
    // Personal data:
    //   Otoniel Millán García
    //   c.c 16548347 de Roldanillo - Valle
    //   Secretario (rendered from the Secretario role on the certificate)
    //
    // The email is intentionally a test-domain address: this is a dev
    // seeder, never a real account. The `down` migration deletes by this
    // email, so it must not change.
    await queryInterface.bulkInsert('usuario', [
      {
        alias_usuario: 'oto1234',
        nombres_usuario: 'Otoniel',
        apellidos_usuario: 'Millán García',
        id_tipodocumento_usuario: documentTypeId,
        identificacion_usuario: '16548347',
        id_municipio_usuario: municipalityId,
        id_rol_usuario: roleId,
        id_nivel_academico: academicLevelId,
        email_usuario: 'otonielramirez@test.local',
        estado_usuario: 'ACTIVO',
        password_usuario: rawPassword,
        id_genero: genderId,
        ultimo_login_usuario: new Date(),
        fecha_creacion: new Date(),
        fecha_modificacion: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    if (process.env.NODE_ENV === 'production') {
      return;
    }

    await queryInterface.bulkDelete('usuario', {
      email_usuario: 'otonielramirez@test.local',
    });
  },
};
