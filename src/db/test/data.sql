-- ============================================================================
-- TEST DATA — Multi-Year Academic Progression Scenario
-- ============================================================================
--   3 students · 3 enrollments each = 9 enrollments
--   9 groups · 13 subjects · 117 scores (13 × 9)
--   5 phones · 9 certificates · 2 recipients
--
-- Three scoring scales exercised, one per student:
--   • Juan Pérez      — 1–5 numeric (modern Colombian system, pass ≥ 3.0)
--   • Mariana Osorio  — alphabetic (Deficiente … Excelente)
--   • Santiago Caicedo — 1–10 numeric (old Colombian system, pass ≥ 6.0)
--
-- Each enrollment has exactly one failing subject with a passing remedial.
-- Every other subject passes with an empty remedial (`''` — the column is
-- NOT NULL, so empty string is the "no remedial" sentinel).
--
-- ⚠ Run as ONE stream. See Section 7 for details.
-- ============================================================================


-- ── 1. Subjects (asignatura) ────────────────────────────────────────────────

INSERT IGNORE INTO asignatura
  (nombre_asignatura, descripcion_asignatura, intensidad_horaria)
VALUES
  ('Matemáticas',         'Aritmética, álgebra y geometría',     5),
  ('Español',             'Lengua castellana y literatura',      5),
  ('Ciencias Naturales', 'Biología, química y física',          4),
  ('Ciencias Sociales',  'Historia, geografía y democracia',    4),
  ('Inglés',              'Idioma extranjero - inglés',          3),
  ('Educación Física',   'Deporte y salud corporal',            2),
  ('Educación Artística','Artes plásticas y música',            2),
  ('Ética y Valores',    'Formación ética y ciudadana',          1),
  ('Religión',            'Educación religiosa y moral',          1),
  ('Tecnología',          'Informática y tecnología',            2),
  ('Filosofía',           'Pensamiento crítico y filosofía',     3),
  ('Química',             'Química general e inorgánica',        4),
  ('Física',              'Física clásica y mecánica',           4);


-- ── 2. Reference Catalogs & Institution ─────────────────────────────────────

SET @inst_id = (SELECT id_institucion FROM institucion WHERE nit_institucion = '891900837-2' LIMIT 1);

-- Grades
SET @g_sexto    = (SELECT id_grado FROM grado WHERE nombre_grado = 'Sexto'    LIMIT 1);
SET @g_septimo  = (SELECT id_grado FROM grado WHERE nombre_grado = 'Séptimo'  LIMIT 1);
SET @g_octavo   = (SELECT id_grado FROM grado WHERE nombre_grado = 'Octavo'   LIMIT 1);
SET @g_noveno   = (SELECT id_grado FROM grado WHERE nombre_grado = 'Noveno'   LIMIT 1);
SET @g_decimo   = (SELECT id_grado FROM grado WHERE nombre_grado = 'Décimo'   LIMIT 1);
SET @g_undecimo = (SELECT id_grado FROM grado WHERE nombre_grado = 'Undécimo' LIMIT 1);

-- Document types & genders
SET @dt_ti    = (SELECT id_tipo_documento FROM tipo_documento WHERE nombre_tipodocumento = 'Tarjeta de Identidad'   LIMIT 1);
SET @dt_cc    = (SELECT id_tipo_documento FROM tipo_documento WHERE nombre_tipodocumento = 'Cédula de Ciudadanía' LIMIT 1);
SET @gen_masc = (SELECT id_genero FROM genero WHERE nombre_genero = 'Masculino' LIMIT 1);
SET @gen_fem  = (SELECT id_genero FROM genero WHERE nombre_genero = 'Femenino'  LIMIT 1);

-- Municipalities (Valle del Cauca)
SET @muni_roldanillo = (
  SELECT m.id_municipio FROM municipio m
  JOIN departamento d ON m.id_departamento = d.id_departamento
  WHERE m.nombre_municipio = 'Roldanillo' AND d.nombre_departamento = 'Valle del Cauca' LIMIT 1
);
SET @muni_cali = (
  SELECT m.id_municipio FROM municipio m
  JOIN departamento d ON m.id_departamento = d.id_departamento
  WHERE m.nombre_municipio = 'Cali' AND d.nombre_departamento = 'Valle del Cauca' LIMIT 1
);
SET @muni_palmira = (
  SELECT m.id_municipio FROM municipio m
  JOIN departamento d ON m.id_departamento = d.id_departamento
  WHERE m.nombre_municipio = 'Palmira' AND d.nombre_departamento = 'Valle del Cauca' LIMIT 1
);


-- ── 3. Groups (grupo) ───────────────────────────────────────────────────────
-- 9 groups: three academic years per student, distinct name + year.

INSERT IGNORE INTO grupo
  (nombre_grupo, anio_grupo, id_grado_grupo, jornada, id_institucion, estado_grupo)
VALUES
  -- Juan's trajectory: 2020 → 2021 → 2022
  ('6-A',  2020, @g_sexto,    'Diurna', @inst_id, 'Activo'),
  ('7-A',  2021, @g_septimo,  'Diurna', @inst_id, 'Activo'),
  ('8-A',  2022, @g_octavo,   'Diurna', @inst_id, 'Activo'),
  -- Mariana's trajectory: 2022 → 2023 → 2024
  ('7-B',  2022, @g_septimo,  'Diurna', @inst_id, 'Activo'),
  ('8-B',  2023, @g_octavo,   'Diurna', @inst_id, 'Activo'),
  ('9-A',  2024, @g_noveno,   'Diurna', @inst_id, 'Activo'),
  -- Santiago's trajectory: 2023 → 2024 → 2025
  ('9-B',  2023, @g_noveno,   'Diurna', @inst_id, 'Activo'),
  ('10-A', 2024, @g_decimo,   'Diurna', @inst_id, 'Activo'),
  ('11-A', 2025, @g_undecimo, 'Diurna', @inst_id, 'Activo');

SET @grp_6a_2020  = (SELECT id_grupo FROM grupo WHERE nombre_grupo = '6-A'  AND anio_grupo = 2020 LIMIT 1);
SET @grp_7a_2021  = (SELECT id_grupo FROM grupo WHERE nombre_grupo = '7-A'  AND anio_grupo = 2021 LIMIT 1);
SET @grp_8a_2022  = (SELECT id_grupo FROM grupo WHERE nombre_grupo = '8-A'  AND anio_grupo = 2022 LIMIT 1);
SET @grp_7b_2022  = (SELECT id_grupo FROM grupo WHERE nombre_grupo = '7-B'  AND anio_grupo = 2022 LIMIT 1);
SET @grp_8b_2023  = (SELECT id_grupo FROM grupo WHERE nombre_grupo = '8-B'  AND anio_grupo = 2023 LIMIT 1);
SET @grp_9a_2024  = (SELECT id_grupo FROM grupo WHERE nombre_grupo = '9-A'  AND anio_grupo = 2024 LIMIT 1);
SET @grp_9b_2023  = (SELECT id_grupo FROM grupo WHERE nombre_grupo = '9-B'  AND anio_grupo = 2023 LIMIT 1);
SET @grp_10a_2024 = (SELECT id_grupo FROM grupo WHERE nombre_grupo = '10-A' AND anio_grupo = 2024 LIMIT 1);
SET @grp_11a_2025 = (SELECT id_grupo FROM grupo WHERE nombre_grupo = '11-A' AND anio_grupo = 2025 LIMIT 1);


-- ── 4. Students (estudiante) ────────────────────────────────────────────────

INSERT IGNORE INTO estudiante
  (primer_nombre_estudiante, segundo_nombre_estudiante,
   primer_apellido_estudiante, segundo_apellido_estudiante,
   identificacion_estudiante, fecha_nacimiento_estudiante,
   id_municipio_estudiante, id_tipo_documento_estudiante, id_genero_estudiante,
   direccion_estudiante, email_estudiante)
VALUES
  -- 1. Juan Camilo Pérez Rodríguez — 1–5 numeric scale
  ('Juan', 'Camilo', 'Pérez', 'Rodríguez',
   '1085123456', '2008-03-15',
   @muni_roldanillo, @dt_ti, @gen_masc,
   'Calle 5 # 4-32 Barrio Centro', 'juan.perez.test@test.local'),

  -- 2. Mariana Lucía Osorio Bermúdez — alphabetic scale
  ('Mariana', 'Lucía', 'Osorio', 'Bermúdez',
   '1085112233', '2007-01-30',
   @muni_cali, @dt_ti, @gen_fem,
   'Carrera 4 # 10-18 Barrio El Carmen', 'mariana.osorio.test@test.local'),

  -- 3. Santiago Andrés Caicedo Mosquera — 1–10 numeric scale
  ('Santiago', 'Andrés', 'Caicedo', 'Mosquera',
   '1085456789', '2006-11-05',
   @muni_palmira, @dt_cc, @gen_masc,
   'Calle 12 # 22-10 Barrio Las Mercedes', 'santiago.caicedo.test@test.local');

SET @st_juan     = (SELECT id_estudiante FROM estudiante WHERE identificacion_estudiante = '1085123456' LIMIT 1);
SET @st_mariana  = (SELECT id_estudiante FROM estudiante WHERE identificacion_estudiante = '1085112233' LIMIT 1);
SET @st_santiago = (SELECT id_estudiante FROM estudiante WHERE identificacion_estudiante = '1085456789' LIMIT 1);


-- ── 5. Enrollments (matricula) — 3 per student ──────────────────────────────

INSERT IGNORE INTO matricula
  (id_estudiante_matricula, id_grupo_matricula, fecha_matricula)
VALUES
  -- Juan: 2020, 2021, 2022
  (@st_juan, @grp_6a_2020, '2020-02-03'),
  (@st_juan, @grp_7a_2021, '2021-02-01'),
  (@st_juan, @grp_8a_2022, '2022-02-07'),

  -- Mariana: 2022, 2023, 2024
  (@st_mariana, @grp_7b_2022, '2022-02-07'),
  (@st_mariana, @grp_8b_2023, '2023-02-06'),
  (@st_mariana, @grp_9a_2024, '2024-02-05'),

  -- Santiago: 2023, 2024, 2025
  (@st_santiago, @grp_9b_2023,  '2023-02-10'),
  (@st_santiago, @grp_10a_2024, '2024-02-12'),
  (@st_santiago, @grp_11a_2025, '2025-02-03');

SET @enr_juan_2020 = (SELECT id_matricula FROM matricula WHERE id_estudiante_matricula = @st_juan     AND id_grupo_matricula = @grp_6a_2020  LIMIT 1);
SET @enr_juan_2021 = (SELECT id_matricula FROM matricula WHERE id_estudiante_matricula = @st_juan     AND id_grupo_matricula = @grp_7a_2021  LIMIT 1);
SET @enr_juan_2022 = (SELECT id_matricula FROM matricula WHERE id_estudiante_matricula = @st_juan     AND id_grupo_matricula = @grp_8a_2022  LIMIT 1);

SET @enr_mar_2022  = (SELECT id_matricula FROM matricula WHERE id_estudiante_matricula = @st_mariana  AND id_grupo_matricula = @grp_7b_2022  LIMIT 1);
SET @enr_mar_2023  = (SELECT id_matricula FROM matricula WHERE id_estudiante_matricula = @st_mariana  AND id_grupo_matricula = @grp_8b_2023  LIMIT 1);
SET @enr_mar_2024  = (SELECT id_matricula FROM matricula WHERE id_estudiante_matricula = @st_mariana  AND id_grupo_matricula = @grp_9a_2024  LIMIT 1);

SET @enr_sant_2023 = (SELECT id_matricula FROM matricula WHERE id_estudiante_matricula = @st_santiago AND id_grupo_matricula = @grp_9b_2023  LIMIT 1);
SET @enr_sant_2024 = (SELECT id_matricula FROM matricula WHERE id_estudiante_matricula = @st_santiago AND id_grupo_matricula = @grp_10a_2024 LIMIT 1);
SET @enr_sant_2025 = (SELECT id_matricula FROM matricula WHERE id_estudiante_matricula = @st_santiago AND id_grupo_matricula = @grp_11a_2025 LIMIT 1);


-- ── 6. Subject References ───────────────────────────────────────────────────

SET @sub_mat = (SELECT id_asignatura FROM asignatura WHERE nombre_asignatura = 'Matemáticas'         LIMIT 1);
SET @sub_esp = (SELECT id_asignatura FROM asignatura WHERE nombre_asignatura = 'Español'             LIMIT 1);
SET @sub_nat = (SELECT id_asignatura FROM asignatura WHERE nombre_asignatura = 'Ciencias Naturales'  LIMIT 1);
SET @sub_soc = (SELECT id_asignatura FROM asignatura WHERE nombre_asignatura = 'Ciencias Sociales'   LIMIT 1);
SET @sub_ing = (SELECT id_asignatura FROM asignatura WHERE nombre_asignatura = 'Inglés'              LIMIT 1);
SET @sub_ef  = (SELECT id_asignatura FROM asignatura WHERE nombre_asignatura = 'Educación Física'    LIMIT 1);
SET @sub_ea  = (SELECT id_asignatura FROM asignatura WHERE nombre_asignatura = 'Educación Artística' LIMIT 1);
SET @sub_eti = (SELECT id_asignatura FROM asignatura WHERE nombre_asignatura = 'Ética y Valores'     LIMIT 1);
SET @sub_rel = (SELECT id_asignatura FROM asignatura WHERE nombre_asignatura = 'Religión'            LIMIT 1);
SET @sub_tec = (SELECT id_asignatura FROM asignatura WHERE nombre_asignatura = 'Tecnología'          LIMIT 1);
SET @sub_fil = (SELECT id_asignatura FROM asignatura WHERE nombre_asignatura = 'Filosofía'           LIMIT 1);
SET @sub_qui = (SELECT id_asignatura FROM asignatura WHERE nombre_asignatura = 'Química'             LIMIT 1);
SET @sub_fis = (SELECT id_asignatura FROM asignatura WHERE nombre_asignatura = 'Física'              LIMIT 1);


-- ── 7. Scores (calificacion) — 13 per enrollment × 9 = 117 rows ─────────────
--
-- Self-contained re-derivation: Section 7 is robust to clients that reset
-- the session between statements. If a reference is missing, the assert
-- fires before the INSERT, with a clear message.

SET @st_juan     = (SELECT id_estudiante FROM estudiante WHERE identificacion_estudiante = '1085123456' LIMIT 1);
SET @st_mariana  = (SELECT id_estudiante FROM estudiante WHERE identificacion_estudiante = '1085112233' LIMIT 1);
SET @st_santiago = (SELECT id_estudiante FROM estudiante WHERE identificacion_estudiante = '1085456789' LIMIT 1);

SET @grp_6a_2020  = (SELECT id_grupo FROM grupo WHERE nombre_grupo = '6-A'  AND anio_grupo = 2020 LIMIT 1);
SET @grp_7a_2021  = (SELECT id_grupo FROM grupo WHERE nombre_grupo = '7-A'  AND anio_grupo = 2021 LIMIT 1);
SET @grp_8a_2022  = (SELECT id_grupo FROM grupo WHERE nombre_grupo = '8-A'  AND anio_grupo = 2022 LIMIT 1);
SET @grp_7b_2022  = (SELECT id_grupo FROM grupo WHERE nombre_grupo = '7-B'  AND anio_grupo = 2022 LIMIT 1);
SET @grp_8b_2023  = (SELECT id_grupo FROM grupo WHERE nombre_grupo = '8-B'  AND anio_grupo = 2023 LIMIT 1);
SET @grp_9a_2024  = (SELECT id_grupo FROM grupo WHERE nombre_grupo = '9-A'  AND anio_grupo = 2024 LIMIT 1);
SET @grp_9b_2023  = (SELECT id_grupo FROM grupo WHERE nombre_grupo = '9-B'  AND anio_grupo = 2023 LIMIT 1);
SET @grp_10a_2024 = (SELECT id_grupo FROM grupo WHERE nombre_grupo = '10-A' AND anio_grupo = 2024 LIMIT 1);
SET @grp_11a_2025 = (SELECT id_grupo FROM grupo WHERE nombre_grupo = '11-A' AND anio_grupo = 2025 LIMIT 1);

SET @enr_juan_2020 = (SELECT id_matricula FROM matricula WHERE id_estudiante_matricula = @st_juan     AND id_grupo_matricula = @grp_6a_2020  LIMIT 1);
SET @enr_juan_2021 = (SELECT id_matricula FROM matricula WHERE id_estudiante_matricula = @st_juan     AND id_grupo_matricula = @grp_7a_2021  LIMIT 1);
SET @enr_juan_2022 = (SELECT id_matricula FROM matricula WHERE id_estudiante_matricula = @st_juan     AND id_grupo_matricula = @grp_8a_2022  LIMIT 1);

SET @enr_mar_2022  = (SELECT id_matricula FROM matricula WHERE id_estudiante_matricula = @st_mariana  AND id_grupo_matricula = @grp_7b_2022  LIMIT 1);
SET @enr_mar_2023  = (SELECT id_matricula FROM matricula WHERE id_estudiante_matricula = @st_mariana  AND id_grupo_matricula = @grp_8b_2023  LIMIT 1);
SET @enr_mar_2024  = (SELECT id_matricula FROM matricula WHERE id_estudiante_matricula = @st_mariana  AND id_grupo_matricula = @grp_9a_2024  LIMIT 1);

SET @enr_sant_2023 = (SELECT id_matricula FROM matricula WHERE id_estudiante_matricula = @st_santiago AND id_grupo_matricula = @grp_9b_2023  LIMIT 1);
SET @enr_sant_2024 = (SELECT id_matricula FROM matricula WHERE id_estudiante_matricula = @st_santiago AND id_grupo_matricula = @grp_10a_2024 LIMIT 1);
SET @enr_sant_2025 = (SELECT id_matricula FROM matricula WHERE id_estudiante_matricula = @st_santiago AND id_grupo_matricula = @grp_11a_2025 LIMIT 1);

SET @sub_mat = (SELECT id_asignatura FROM asignatura WHERE nombre_asignatura = 'Matemáticas'         LIMIT 1);
SET @sub_esp = (SELECT id_asignatura FROM asignatura WHERE nombre_asignatura = 'Español'             LIMIT 1);
SET @sub_nat = (SELECT id_asignatura FROM asignatura WHERE nombre_asignatura = 'Ciencias Naturales'  LIMIT 1);
SET @sub_soc = (SELECT id_asignatura FROM asignatura WHERE nombre_asignatura = 'Ciencias Sociales'   LIMIT 1);
SET @sub_ing = (SELECT id_asignatura FROM asignatura WHERE nombre_asignatura = 'Inglés'              LIMIT 1);
SET @sub_ef  = (SELECT id_asignatura FROM asignatura WHERE nombre_asignatura = 'Educación Física'    LIMIT 1);
SET @sub_ea  = (SELECT id_asignatura FROM asignatura WHERE nombre_asignatura = 'Educación Artística' LIMIT 1);
SET @sub_eti = (SELECT id_asignatura FROM asignatura WHERE nombre_asignatura = 'Ética y Valores'     LIMIT 1);
SET @sub_rel = (SELECT id_asignatura FROM asignatura WHERE nombre_asignatura = 'Religión'            LIMIT 1);
SET @sub_tec = (SELECT id_asignatura FROM asignatura WHERE nombre_asignatura = 'Tecnología'          LIMIT 1);
SET @sub_fil = (SELECT id_asignatura FROM asignatura WHERE nombre_asignatura = 'Filosofía'           LIMIT 1);
SET @sub_qui = (SELECT id_asignatura FROM asignatura WHERE nombre_asignatura = 'Química'             LIMIT 1);
SET @sub_fis = (SELECT id_asignatura FROM asignatura WHERE nombre_asignatura = 'Física'              LIMIT 1);

-- Fail loudly on NULL refs. MESSAGE_TEXT has a hard 128-char limit.
DROP PROCEDURE IF EXISTS assert_refs_ok;
DELIMITER $$
CREATE PROCEDURE assert_refs_ok()
BEGIN
  IF @enr_juan_2020 IS NULL OR @enr_juan_2021 IS NULL OR @enr_juan_2022 IS NULL
     OR @enr_mar_2022 IS NULL OR @enr_mar_2023 IS NULL OR @enr_mar_2024 IS NULL
     OR @enr_sant_2023 IS NULL OR @enr_sant_2024 IS NULL OR @enr_sant_2025 IS NULL
     OR @sub_mat IS NULL OR @sub_esp IS NULL OR @sub_nat IS NULL OR @sub_soc IS NULL
     OR @sub_ing IS NULL OR @sub_ef  IS NULL OR @sub_ea  IS NULL OR @sub_eti IS NULL
     OR @sub_rel IS NULL OR @sub_tec IS NULL OR @sub_fil IS NULL OR @sub_qui IS NULL
     OR @sub_fis IS NULL
  THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'NULL ref: ensure Sections 1-5 ran (students, groups, enrollments, subjects).';
  END IF;
END$$
DELIMITER ;

CALL assert_refs_ok();
DROP PROCEDURE assert_refs_ok;

-- Idempotent: wipe the scores for our 9 enrollments before re-inserting.
DELETE FROM calificacion
 WHERE id_matricula_calificacion IN (
   @enr_juan_2020, @enr_juan_2021, @enr_juan_2022,
   @enr_mar_2022,  @enr_mar_2023,  @enr_mar_2024,
   @enr_sant_2023, @enr_sant_2024, @enr_sant_2025
 );

INSERT INTO calificacion
  (nota_original_calificacion, tipo_nota_calificacion,
   id_asignatura_calificacion, nota_habilitacion, id_matricula_calificacion)
VALUES

  -- ══════════════════════════════════════════════════════════════════════════
  -- Juan Pérez — 1–5 numeric scale, 3 years
  -- ══════════════════════════════════════════════════════════════════════════

  -- 2020 · 6-A · fail Inglés (2.8 → 3.2)
  ('4.0','NUMERICA',@sub_mat,'',   @enr_juan_2020), ('4.2','NUMERICA',@sub_esp,'',   @enr_juan_2020),
  ('3.8','NUMERICA',@sub_nat,'',   @enr_juan_2020), ('4.1','NUMERICA',@sub_soc,'',   @enr_juan_2020),
  ('2.8','NUMERICA',@sub_ing,'3.2',@enr_juan_2020), ('4.3','NUMERICA',@sub_ef,'',    @enr_juan_2020),
  ('3.5','NUMERICA',@sub_ea,'',    @enr_juan_2020), ('4.0','NUMERICA',@sub_eti,'',   @enr_juan_2020),
  ('4.5','NUMERICA',@sub_rel,'',   @enr_juan_2020), ('3.6','NUMERICA',@sub_tec,'',   @enr_juan_2020),
  ('3.9','NUMERICA',@sub_fil,'',   @enr_juan_2020), ('3.5','NUMERICA',@sub_qui,'',   @enr_juan_2020),
  ('3.7','NUMERICA',@sub_fis,'',   @enr_juan_2020),

  -- 2021 · 7-A · fail Ciencias Naturales (2.9 → 3.3)
  ('4.1','NUMERICA',@sub_mat,'',   @enr_juan_2021), ('4.3','NUMERICA',@sub_esp,'',   @enr_juan_2021),
  ('2.9','NUMERICA',@sub_nat,'3.3',@enr_juan_2021), ('4.2','NUMERICA',@sub_soc,'',   @enr_juan_2021),
  ('3.5','NUMERICA',@sub_ing,'',   @enr_juan_2021), ('4.2','NUMERICA',@sub_ef,'',    @enr_juan_2021),
  ('3.8','NUMERICA',@sub_ea,'',    @enr_juan_2021), ('4.1','NUMERICA',@sub_eti,'',   @enr_juan_2021),
  ('4.4','NUMERICA',@sub_rel,'',   @enr_juan_2021), ('3.9','NUMERICA',@sub_tec,'',   @enr_juan_2021),
  ('4.0','NUMERICA',@sub_fil,'',   @enr_juan_2021), ('3.6','NUMERICA',@sub_qui,'',   @enr_juan_2021),
  ('3.8','NUMERICA',@sub_fis,'',   @enr_juan_2021),

  -- 2022 · 8-A · fail Educación Artística (2.6 → 3.1)
  ('4.3','NUMERICA',@sub_mat,'',   @enr_juan_2022), ('4.4','NUMERICA',@sub_esp,'',   @enr_juan_2022),
  ('4.0','NUMERICA',@sub_nat,'',   @enr_juan_2022), ('4.3','NUMERICA',@sub_soc,'',   @enr_juan_2022),
  ('3.8','NUMERICA',@sub_ing,'',   @enr_juan_2022), ('4.5','NUMERICA',@sub_ef,'',    @enr_juan_2022),
  ('2.6','NUMERICA',@sub_ea,'3.1', @enr_juan_2022), ('4.2','NUMERICA',@sub_eti,'',   @enr_juan_2022),
  ('4.6','NUMERICA',@sub_rel,'',   @enr_juan_2022), ('4.0','NUMERICA',@sub_tec,'',   @enr_juan_2022),
  ('4.2','NUMERICA',@sub_fil,'',   @enr_juan_2022), ('3.9','NUMERICA',@sub_qui,'',   @enr_juan_2022),
  ('4.1','NUMERICA',@sub_fis,'',   @enr_juan_2022),

  -- ══════════════════════════════════════════════════════════════════════════
  -- Mariana Osorio — alphabetic scale, 3 years
  -- ══════════════════════════════════════════════════════════════════════════

  -- 2022 · 7-B · fail Inglés (Insuficiente → Aceptable)
  ('Sobresaliente','ALFABETICA',@sub_mat,'',         @enr_mar_2022),
  ('Excelente',    'ALFABETICA',@sub_esp,'',         @enr_mar_2022),
  ('Aceptable',    'ALFABETICA',@sub_nat,'',         @enr_mar_2022),
  ('Sobresaliente','ALFABETICA',@sub_soc,'',         @enr_mar_2022),
  ('Insuficiente', 'ALFABETICA',@sub_ing,'Aceptable',@enr_mar_2022),
  ('Excelente',    'ALFABETICA',@sub_ef, '',         @enr_mar_2022),
  ('Sobresaliente','ALFABETICA',@sub_ea, '',         @enr_mar_2022),
  ('Aceptable',    'ALFABETICA',@sub_eti,'',         @enr_mar_2022),
  ('Excelente',    'ALFABETICA',@sub_rel,'',         @enr_mar_2022),
  ('Aceptable',    'ALFABETICA',@sub_tec,'',         @enr_mar_2022),
  ('Aceptable',    'ALFABETICA',@sub_fil,'',         @enr_mar_2022),
  ('Aceptable',    'ALFABETICA',@sub_qui,'',         @enr_mar_2022),
  ('Aceptable',    'ALFABETICA',@sub_fis,'',         @enr_mar_2022),

  -- 2023 · 8-B · fail Matemáticas (Deficiente → Aceptable)
  ('Deficiente',   'ALFABETICA',@sub_mat,'Aceptable',@enr_mar_2023),
  ('Excelente',    'ALFABETICA',@sub_esp,'',         @enr_mar_2023),
  ('Sobresaliente','ALFABETICA',@sub_nat,'',         @enr_mar_2023),
  ('Sobresaliente','ALFABETICA',@sub_soc,'',         @enr_mar_2023),
  ('Aceptable',    'ALFABETICA',@sub_ing,'',         @enr_mar_2023),
  ('Excelente',    'ALFABETICA',@sub_ef, '',         @enr_mar_2023),
  ('Sobresaliente','ALFABETICA',@sub_ea, '',         @enr_mar_2023),
  ('Aceptable',    'ALFABETICA',@sub_eti,'',         @enr_mar_2023),
  ('Excelente',    'ALFABETICA',@sub_rel,'',         @enr_mar_2023),
  ('Aceptable',    'ALFABETICA',@sub_tec,'',         @enr_mar_2023),
  ('Sobresaliente','ALFABETICA',@sub_fil,'',         @enr_mar_2023),
  ('Aceptable',    'ALFABETICA',@sub_qui,'',         @enr_mar_2023),
  ('Aceptable',    'ALFABETICA',@sub_fis,'',         @enr_mar_2023),

  -- 2024 · 9-A · fail Filosofía (Insuficiente → Aceptable)
  ('Sobresaliente','ALFABETICA',@sub_mat,'',         @enr_mar_2024),
  ('Excelente',    'ALFABETICA',@sub_esp,'',         @enr_mar_2024),
  ('Sobresaliente','ALFABETICA',@sub_nat,'',         @enr_mar_2024),
  ('Excelente',    'ALFABETICA',@sub_soc,'',         @enr_mar_2024),
  ('Sobresaliente','ALFABETICA',@sub_ing,'',         @enr_mar_2024),
  ('Excelente',    'ALFABETICA',@sub_ef, '',         @enr_mar_2024),
  ('Sobresaliente','ALFABETICA',@sub_ea, '',         @enr_mar_2024),
  ('Excelente',    'ALFABETICA',@sub_eti,'',         @enr_mar_2024),
  ('Excelente',    'ALFABETICA',@sub_rel,'',         @enr_mar_2024),
  ('Sobresaliente','ALFABETICA',@sub_tec,'',         @enr_mar_2024),
  ('Insuficiente', 'ALFABETICA',@sub_fil,'Aceptable',@enr_mar_2024),
  ('Sobresaliente','ALFABETICA',@sub_qui,'',         @enr_mar_2024),
  ('Aceptable',    'ALFABETICA',@sub_fis,'',         @enr_mar_2024),

  -- ══════════════════════════════════════════════════════════════════════════
  -- Santiago Caicedo — 1–10 numeric scale, 3 years
  -- ══════════════════════════════════════════════════════════════════════════

  -- 2023 · 9-B · fail Matemáticas (5.0 → 7.0)
  ('5.0','NUMERICA',@sub_mat,'7.0',@enr_sant_2023), ('7.5','NUMERICA',@sub_esp,'',   @enr_sant_2023),
  ('6.5','NUMERICA',@sub_nat,'',   @enr_sant_2023), ('7.0','NUMERICA',@sub_soc,'',   @enr_sant_2023),
  ('6.5','NUMERICA',@sub_ing,'',   @enr_sant_2023), ('8.0','NUMERICA',@sub_ef,'',    @enr_sant_2023),
  ('7.5','NUMERICA',@sub_ea,'',    @enr_sant_2023), ('7.0','NUMERICA',@sub_eti,'',   @enr_sant_2023),
  ('8.5','NUMERICA',@sub_rel,'',   @enr_sant_2023), ('6.5','NUMERICA',@sub_tec,'',   @enr_sant_2023),
  ('6.5','NUMERICA',@sub_fil,'',   @enr_sant_2023), ('6.5','NUMERICA',@sub_qui,'',   @enr_sant_2023),
  ('6.0','NUMERICA',@sub_fis,'',   @enr_sant_2023),

  -- 2024 · 10-A · fail Química (5.5 → 6.5)
  ('7.0','NUMERICA',@sub_mat,'',   @enr_sant_2024), ('7.5','NUMERICA',@sub_esp,'',   @enr_sant_2024),
  ('6.5','NUMERICA',@sub_nat,'',   @enr_sant_2024), ('7.0','NUMERICA',@sub_soc,'',   @enr_sant_2024),
  ('6.5','NUMERICA',@sub_ing,'',   @enr_sant_2024), ('8.0','NUMERICA',@sub_ef,'',    @enr_sant_2024),
  ('7.5','NUMERICA',@sub_ea,'',    @enr_sant_2024), ('7.0','NUMERICA',@sub_eti,'',   @enr_sant_2024),
  ('8.5','NUMERICA',@sub_rel,'',   @enr_sant_2024), ('6.5','NUMERICA',@sub_tec,'',   @enr_sant_2024),
  ('7.0','NUMERICA',@sub_fil,'',   @enr_sant_2024), ('5.5','NUMERICA',@sub_qui,'6.5',@enr_sant_2024),
  ('6.5','NUMERICA',@sub_fis,'',   @enr_sant_2024),

  -- 2025 · 11-A · fail Física (5.5 → 6.5)
  ('7.5','NUMERICA',@sub_mat,'',   @enr_sant_2025), ('8.0','NUMERICA',@sub_esp,'',   @enr_sant_2025),
  ('7.0','NUMERICA',@sub_nat,'',   @enr_sant_2025), ('7.5','NUMERICA',@sub_soc,'',   @enr_sant_2025),
  ('7.0','NUMERICA',@sub_ing,'',   @enr_sant_2025), ('8.5','NUMERICA',@sub_ef,'',    @enr_sant_2025),
  ('8.0','NUMERICA',@sub_ea,'',    @enr_sant_2025), ('7.5','NUMERICA',@sub_eti,'',   @enr_sant_2025),
  ('8.5','NUMERICA',@sub_rel,'',   @enr_sant_2025), ('7.0','NUMERICA',@sub_tec,'',   @enr_sant_2025),
  ('7.5','NUMERICA',@sub_fil,'',   @enr_sant_2025), ('7.0','NUMERICA',@sub_qui,'',   @enr_sant_2025),
  ('5.5','NUMERICA',@sub_fis,'6.5',@enr_sant_2025);


-- ── 8. Summary Query — Students / Enrollments ───────────────────────────────

SELECT e.id_estudiante,
       CONCAT(e.primer_nombre_estudiante, ' ', e.primer_apellido_estudiante) AS estudiante,
       g.nombre_grupo,
       g.anio_grupo,
       gr.nombre_grado,
       m.id_matricula
FROM estudiante e
JOIN matricula m ON e.id_estudiante = m.id_estudiante_matricula
JOIN grupo g ON m.id_grupo_matricula = g.id_grupo
JOIN grado gr ON g.id_grado_grupo = gr.id_grado
ORDER BY e.id_estudiante, g.anio_grupo;


-- ── 9. Phones (telefono) ────────────────────────────────────────────────────

INSERT IGNORE INTO telefono (numero_telefono) VALUES
  ('3001234567'),   -- Juan's mobile
  ('3018765432'),   -- Mariana's mobile
  ('3205551234'),   -- Santiago's mobile
  ('6028889900'),   -- institution main
  ('6028889901');   -- institution alternate

SET @tel_juan_mobile = (SELECT id_telefono FROM telefono WHERE numero_telefono = '3001234567' LIMIT 1);
SET @tel_mariana     = (SELECT id_telefono FROM telefono WHERE numero_telefono = '3018765432' LIMIT 1);
SET @tel_santiago    = (SELECT id_telefono FROM telefono WHERE numero_telefono = '3205551234' LIMIT 1);
SET @tel_inst_main   = (SELECT id_telefono FROM telefono WHERE numero_telefono = '6028889900' LIMIT 1);
SET @tel_inst_alt    = (SELECT id_telefono FROM telefono WHERE numero_telefono = '6028889901' LIMIT 1);


-- ── 10. Certificate Recipients (receptor_certificado) ───────────────────────

INSERT IGNORE INTO receptor_certificado
  (nombre_receptor_certificado, segundo_nombre_receptor_certificado,
   apellidos_receptor_certificado, segundo_apellido_receptor_certificado,
   id_tipodocumento_receptor_certificado, identificacion_receptor_certificado,
   direccion_receptor_certificado)
VALUES
  ('Carlos', 'Andrés', 'Pérez',    'Gómez',    @dt_cc, '16345678', 'Calle 5 # 4-32 Barrio Centro'),
  ('Lucía',  NULL,     'Rodríguez', 'Vargas',  @dt_cc, '52456789', 'Carrera 15 # 8-45 Barrio Granada');

SET @rec_carlos = (SELECT id_receptor_certificado FROM receptor_certificado WHERE identificacion_receptor_certificado = '16345678' LIMIT 1);
SET @rec_lucia  = (SELECT id_receptor_certificado FROM receptor_certificado WHERE identificacion_receptor_certificado = '52456789' LIMIT 1);


-- ── 11. Student-Phone links (estudiante_telefono) ──────────────────────────

INSERT IGNORE INTO estudiante_telefono (id_estudiante, id_telefono) VALUES
  (@st_juan,     @tel_juan_mobile),
  (@st_mariana,  @tel_mariana),
  (@st_santiago, @tel_santiago);


-- ── 12. Institution-Phone links (institucion_telefono) ─────────────────────

INSERT IGNORE INTO institucion_telefono (id_institucion, id_telefono) VALUES
  (@inst_id, @tel_inst_main),
  (@inst_id, @tel_inst_alt);


-- ── 13. CertificateRecipient-Phone links ───────────────────────────────────

INSERT IGNORE INTO receptor_certificado_telefono
  (id_receptor_certificado, id_telefono) VALUES
  (@rec_carlos, @tel_juan_mobile),
  (@rec_lucia,  @tel_mariana);


-- ── 14. Summary Query — Phone Ownership ────────────────────────────────────

SELECT 'estudiante' AS tipo_propietario,
       CONCAT(e.primer_nombre_estudiante, ' ', e.primer_apellido_estudiante) AS propietario,
       t.numero_telefono AS telefono
FROM estudiante_telefono et
JOIN estudiante e ON et.id_estudiante = e.id_estudiante
JOIN telefono t   ON et.id_telefono   = t.id_telefono

UNION ALL

SELECT 'institucion', i.nombre_institucion, t.numero_telefono
FROM institucion_telefono it
JOIN institucion i ON it.id_institucion = i.id_institucion
JOIN telefono t    ON it.id_telefono    = t.id_telefono

UNION ALL

SELECT 'receptor_certificado',
       CONCAT(r.nombre_receptor_certificado, ' ', r.apellidos_receptor_certificado),
       t.numero_telefono
FROM receptor_certificado_telefono rt
JOIN receptor_certificado r ON rt.id_receptor_certificado = r.id_receptor_certificado
JOIN telefono t             ON rt.id_telefono             = t.id_telefono

ORDER BY tipo_propietario, propietario;


-- ── 15. Certificates — 1 per enrollment = 9 total ───────────────────────────

SET @usr_master = (SELECT id_usuario FROM usuario WHERE email_usuario = 'master.dev@test.local' LIMIT 1);

INSERT IGNORE INTO certificado
  (numero_acta_certificado,
   fecha_emision_certificado,
   id_usuario_certificado,
   id_institucion_certificado,
   id_matricula_certificado,
   id_receptor_certificado,
   estado_certificado)
VALUES
  -- Juan — 2020, 2021, 2022
  ('20-001', '2020-11-30', @usr_master, @inst_id, @enr_juan_2020, @rec_carlos, 'EMITIDO'),
  ('21-001', '2021-11-30', @usr_master, @inst_id, @enr_juan_2021, @rec_lucia,  'EMITIDO'),
  ('22-001', '2022-11-30', @usr_master, @inst_id, @enr_juan_2022, @rec_carlos, 'EMITIDO'),

  -- Mariana — 2022, 2023, 2024
  ('22-002', '2022-11-30', @usr_master, @inst_id, @enr_mar_2022,  @rec_lucia,  'EMITIDO'),
  ('23-001', '2023-11-30', @usr_master, @inst_id, @enr_mar_2023,  @rec_lucia,  'EMITIDO'),
  ('24-001', '2024-11-30', @usr_master, @inst_id, @enr_mar_2024,  @rec_carlos, 'EMITIDO'),

  -- Santiago — 2023, 2024, 2025
  ('23-002', '2023-11-30', @usr_master, @inst_id, @enr_sant_2023, @rec_carlos, 'EMITIDO'),
  ('24-002', '2024-11-30', @usr_master, @inst_id, @enr_sant_2024, @rec_lucia,  'EMITIDO'),
  ('25-001', '2025-11-30', @usr_master, @inst_id, @enr_sant_2025, @rec_carlos, 'EMITIDO');


-- ── 16. Verification ────────────────────────────────────────────────────────

SELECT c.numero_acta_certificado AS acta,
       c.estado_certificado AS estado,
       c.fecha_emision_certificado AS emitido,
       CONCAT(e.primer_nombre_estudiante, ' ', e.primer_apellido_estudiante) AS estudiante,
       gr.nombre_grado AS grado,
       g.anio_grupo AS anio,
       g.nombre_grupo AS grupo,
       CONCAT(r.nombre_receptor_certificado, ' ', r.apellidos_receptor_certificado) AS receptor
FROM certificado c
JOIN matricula  m  ON c.id_matricula_certificado = m.id_matricula
JOIN estudiante e  ON m.id_estudiante_matricula  = e.id_estudiante
JOIN grupo      g  ON m.id_grupo_matricula       = g.id_grupo
JOIN grado      gr ON g.id_grado_grupo           = gr.id_grado
LEFT JOIN receptor_certificado r ON c.id_receptor_certificado = r.id_receptor_certificado
ORDER BY c.numero_acta_certificado;

-- Expected output (9 rows):
--
-- acta   | estudiante       | grado     | anio | grupo
-- -------+------------------+-----------+------+-------
-- 20-001 | Juan Pérez       | Sexto     | 2020 | 6-A
-- 21-001 | Juan Pérez       | Séptimo   | 2021 | 7-A
-- 22-001 | Juan Pérez       | Octavo    | 2022 | 8-A
-- 22-002 | Mariana Osorio   | Séptimo   | 2022 | 7-B
-- 23-001 | Mariana Osorio   | Octavo    | 2023 | 8-B
-- 23-002 | Santiago Caicedo | Noveno    | 2023 | 9-B
-- 24-001 | Mariana Osorio   | Noveno    | 2024 | 9-A
-- 24-002 | Santiago Caicedo | Décimo    | 2024 | 10-A
-- 25-001 | Santiago Caicedo | Undécimo  | 2025 | 11-A
