'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    if (process.env.NODE_ENV === 'production') {
      console.log('Skipping rector user seed in production environment.');
      return;
    }

    // ── 1. Catalog lookups (specific rows, not "first available") ────────
    //
    // Every lookup below targets the exact catalog value this person
    // has. The previous version used `ORDER BY id ASC LIMIT 1` for
    // most of these, which happened to work but silently produced the
    // wrong data (e.g. the first inserted academic level, the first
    // gender, an arbitrary municipality). Failing loudly on a missing
    // row is safer than seeding a rector with mismatched personal data.

    const [roles] = await queryInterface.sequelize.query(
      `SELECT id_rol FROM rol WHERE nombre_rol = 'Rector' LIMIT 1;`
    );

    // c.c  →  Cédula de Ciudadanía
    const [documentTypes] = await queryInterface.sequelize.query(
      `SELECT id_tipo_documento
         FROM tipo_documento
        WHERE nombre_tipodocumento = 'Cédula de Ciudadanía'
        LIMIT 1;`
    );

    // Gloria Marcela → Femenino
    const [genders] = await queryInterface.sequelize.query(
      `SELECT id_genero
         FROM genero
        WHERE nombre_genero = 'Femenino'
        LIMIT 1;`
    );

    // Realistic academic level for a school rector.
    // NOTE: this is an assumption — if her actual academic level is
    // different, change only this string. Valid values per the ENUM are:
    // 'Técnico', 'tecnólogo', 'Licenciado', 'Especialista', 'Maestría',
    // 'Doctorado', 'Post-Doctorado'.
    const [academicLevels] = await queryInterface.sequelize.query(
      `SELECT id_nivel_academico
         FROM nivel_academico
        WHERE nombre_nivel_academico = 'Maestría'
        LIMIT 1;`
    );

    // Girón is not unique across Colombia on its own — join to
    // departamento to disambiguate, mirroring the "de Girón - Santander"
    // on the C.C.
    const [municipalities] = await queryInterface.sequelize.query(
      `SELECT m.id_municipio
         FROM municipio m
         JOIN departamento d ON m.id_departamento = d.id_departamento
        WHERE m.nombre_municipio = 'Girón'
          AND d.nombre_departamento = 'Santander'
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
        'Cannot seed rector user: one or more required catalog records ' +
          '(role "Rector", document type "Cédula de Ciudadanía", gender ' +
          '"Femenino", academic level "Especialista", or municipality ' +
          '"Girón" in "Santander") were not found. Make sure all ' +
          'catalog seeders have run before this one.'
      );
    }

    // ── 2. Pre-hashed password (MasterPassword123) ───────────────────────
    const rawPassword =
      '$2b$11$H8f5L428VEQycm0ZEJIF4.S6MQsDC7MAcV28X.p9h0WYMttiM6wQ6';

    // ── 3. Insert the rector user ────────────────────────────────────────
    //
    // Personal data:
    //   Gloria Marcela Belgado Parada
    //   c.c 28148719 de Girón - Santander
    //   Rectora
    //
    // The email is intentionally a test-domain address: this is a dev
    // seeder, never a real account. The `down` migration deletes by this
    // email, so it must not change.
    await queryInterface.bulkInsert('usuario', [
      {
        alias_usuario: 'gloria1234',
        nombres_usuario: 'Gloria Marcela',
        apellidos_usuario: 'Belgado Parada',
        id_tipodocumento_usuario: documentTypeId,
        identificacion_usuario: '28148719',
        id_municipio_usuario: municipalityId,
        id_rol_usuario: roleId,
        id_nivel_academico: academicLevelId,
        email_usuario: 'gloria1234@test.local',
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
      email_usuario: 'gloria1234@test.local',
    });
  },
};
