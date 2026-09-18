'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    if (process.env.NODE_ENV === 'production') {
      console.log('Skipping rector user seed in production environment.');
      return;
    }

    // 1. Safe FK lookups
    const [roles] = await queryInterface.sequelize.query(
      `SELECT id_rol FROM rol WHERE nombre_rol = 'Rector' LIMIT 1;`
    );
    const [documentTypes] = await queryInterface.sequelize.query(
      `SELECT id_tipo_documento FROM tipo_documento ORDER BY id_tipo_documento ASC LIMIT 1;`
    );
    const [genders] = await queryInterface.sequelize.query(
      `SELECT id_genero FROM genero ORDER BY id_genero ASC LIMIT 1;`
    );
    const [academicLevels] = await queryInterface.sequelize.query(
      `SELECT id_nivel_academico FROM nivel_academico ORDER BY id_nivel_academico ASC LIMIT 1;`
    );
    const [municipalities] = await queryInterface.sequelize.query(
      `SELECT id_municipio FROM municipio ORDER BY id_municipio ASC LIMIT 1;`
    );

    const roleId = roles[0]?.id_rol;
    const documentTypeId = documentTypes[0]?.id_tipo_documento;
    const genderId = genders[0]?.id_genero;
    const academicLevelId = academicLevels[0]?.id_nivel_academico;
    const municipalityId = municipalities[0]?.id_municipio;

    if (!roleId || !documentTypeId || !genderId || !academicLevelId || !municipalityId) {
      throw new Error(
        'Cannot seed rector user: Required lookup data (role, document type, gender, academic level, or municipality) was not found.'
      );
    }

    // 2. Pre-hashed password (MasterPassword123)
    const rawPassword = '$2b$11$H8f5L428VEQycm0ZEJIF4.S6MQsDC7MAcV28X.p9h0WYMttiM6wQ6';

    // 3. Insert Rector user
    await queryInterface.bulkInsert('usuario', [
      {
        alias_usuario: 'rectordev',
        nombres_usuario: 'Rector',
        apellidos_usuario: 'Developer',
        id_tipodocumento_usuario: documentTypeId,
        identificacion_usuario: '5555555555',
        id_municipio_usuario: municipalityId,
        id_rol_usuario: roleId,
        id_nivel_academico: academicLevelId,
        email_usuario: 'rector.dev@test.local',
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
      email_usuario: 'rector.dev@test.local',
    });
  },
};
