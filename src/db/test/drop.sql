SET FOREIGN_KEY_CHECKS = 0;

-- Junction / dependent tables first
DROP TABLE IF EXISTS `certificado_matricula`;
DROP TABLE IF EXISTS `firma_certificado`;
DROP TABLE IF EXISTS `receptor_certificado_telefono`;
DROP TABLE IF EXISTS `usuario_telefono`;
DROP TABLE IF EXISTS `estudiante_telefono`;
DROP TABLE IF EXISTS `institucion_telefono`;
DROP TABLE IF EXISTS `calificacion`;

-- Core entities
DROP TABLE IF EXISTS `certificado`;
DROP TABLE IF EXISTS `receptor_certificado`;
DROP TABLE IF EXISTS `matricula`;
DROP TABLE IF EXISTS `grupo`;
DROP TABLE IF EXISTS `usuario`;
DROP TABLE IF EXISTS `estudiante`;
DROP TABLE IF EXISTS `institucion`;

-- Catalogs
DROP TABLE IF EXISTS `telefono`;
DROP TABLE IF EXISTS `asignatura`;
DROP TABLE IF EXISTS `grado`;
DROP TABLE IF EXISTS `municipio`;
DROP TABLE IF EXISTS `departamento`;
DROP TABLE IF EXISTS `pais`;
DROP TABLE IF EXISTS `tipo_documento`;
DROP TABLE IF EXISTS `rol`;
DROP TABLE IF EXISTS `genero`;
DROP TABLE IF EXISTS `nivel_academico`;

-- Sequelize migration bookkeeping — dropping this forces every migration
-- to re-run on the next `migrations:run`.
DROP TABLE IF EXISTS `SequelizeMeta`;

SET FOREIGN_KEY_CHECKS = 1;
