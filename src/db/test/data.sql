-- ============================================================================
-- TEST DATA — Academic-progress endpoints
-- ============================================================================
-- Populates the five tables that have no seeder (asignatura, grupo,
-- estudiante, matricula, calificacion) with one rich, self-contained
-- scenario that exercises:
--
--   POST /students/get-course-years       (studentId)
--   POST /students/get-academic-history   (studentId)
--   POST /students/get-scores-by-year     (studentId, year)
--   POST /students/get-scores-by-grade    (studentId, gradeName)
--
-- Scenario: "Juan Camilo Pérez Rodríguez", born 2008-03-15, enrolled at
-- the seeded institution across four consecutive academic years — with
-- Séptimo repeated once, so get-scores-by-grade has rows from two
-- different years to merge:
--
--   2020 → grade "Sexto"    group "6-A"
--   2021 → grade "Séptimo"  group "7-A"
--   2022 → grade "Séptimo"  group "7-B"    <-- repeated
--   2023 → grade "Octavo"   group "8-A"
--
-- Every INSERT uses INSERT IGNORE, so the script is idempotent: running
-- it twice does not error and does not create duplicates. All foreign
-- keys are resolved by natural key (name / NIT / document number) rather
-- than by hardcoded id, so it survives a reseeded catalog.
--
-- Prerequisites: the standard seed chain must have already run
-- (country, departments, municipalities, genders, document types,
-- roles, academic levels, grades, institution).
-- ============================================================================


-- ── 1. Subjects (asignatura) ────────────────────────────────────────────────
-- Core Colombian básica secundaria curriculum. Names fit VARCHAR(20);
-- descriptions fit VARCHAR(50); intensity is a single digit 1–9.

INSERT IGNORE INTO asignatura
  (nombre_asignatura, descripcion_asignatura, intensidad_horaria)
VALUES
  ('Matemáticas',        'Aritmética, álgebra y geometría',     5),
  ('Español',            'Lengua castellana y literatura',      5),
  ('Ciencias Naturales', 'Biología, química y física',          4),
  ('Ciencias Sociales',  'Historia, geografía y democracia',    4),
  ('Inglés',             'Idioma extranjero - inglés',          3),
  ('Educación Física',   'Deporte y salud corporal',            2),
  ('Educación Artística','Artes plásticas y música',            2),
  ('Ética y Valores',    'Formación ética y ciudadana',         1),
  ('Religión',           'Educación religiosa y moral',         1),
  ('Tecnología',         'Informática y tecnología',            2);


-- ── 2. Groups (grupo) ───────────────────────────────────────────────────────
-- Four groups at the one seeded institution, four different academic years.

SET @inst_id   = (SELECT id_institucion FROM institucion
                  WHERE nit_institucion = '891900837-2' LIMIT 1);

SET @g_sexto   = (SELECT id_grado FROM grado WHERE nombre_grado = 'Sexto'   LIMIT 1);
SET @g_septimo = (SELECT id_grado FROM grado WHERE nombre_grado = 'Séptimo' LIMIT 1);
SET @g_octavo  = (SELECT id_grado FROM grado WHERE nombre_grado = 'Octavo'  LIMIT 1);

INSERT IGNORE INTO grupo
  (nombre_grupo, anio_grupo, id_grado_grupo, jornada, id_institucion, estado_grupo)
VALUES
  ('6-A', 2020, @g_sexto,   'DIURNA', @inst_id, 'ACTIVO'),
  ('7-A', 2021, @g_septimo, 'DIURNA', @inst_id, 'ACTIVO'),
  ('7-B', 2022, @g_septimo, 'DIURNA', @inst_id, 'ACTIVO'),
  ('8-A', 2023, @g_octavo,  'DIURNA', @inst_id, 'ACTIVO');

SET @grp_2020 = (SELECT id_grupo FROM grupo WHERE nombre_grupo = '6-A' AND anio_grupo = 2020 LIMIT 1);
SET @grp_2021 = (SELECT id_grupo FROM grupo WHERE nombre_grupo = '7-A' AND anio_grupo = 2021 LIMIT 1);
SET @grp_2022 = (SELECT id_grupo FROM grupo WHERE nombre_grupo = '7-B' AND anio_grupo = 2022 LIMIT 1);
SET @grp_2023 = (SELECT id_grupo FROM grupo WHERE nombre_grupo = '8-A' AND anio_grupo = 2023 LIMIT 1);


-- ── 3. Student (estudiante) ─────────────────────────────────────────────────
-- Municipality resolved by name, since the municipality seeder assigns ids
-- dynamically. Names are single-word to satisfy the RegEx patterns used by
-- the API layer ([\p{L}]{3,50}, no spaces).

SET @muni_roldanillo = (
  SELECT m.id_municipio
  FROM municipio m
  JOIN departamento d ON m.id_departamento = d.id_departamento
  WHERE m.nombre_municipio = 'Roldanillo'
    AND d.nombre_departamento = 'Valle del Cauca'
  LIMIT 1
);

SET @dt_ti    = (SELECT id_tipo_documento FROM tipo_documento
                 WHERE nombre_tipodocumento = 'Tarjeta de Identidad' LIMIT 1);
SET @gen_masc = (SELECT id_genero FROM genero
                 WHERE nombre_genero = 'Masculino' LIMIT 1);

INSERT IGNORE INTO estudiante
  (primer_nombre_estudiante, segundo_nombre_estudiante,
   primer_apellido_estudiante, segundo_apellido_estudiante,
   identificacion_estudiante, fecha_nacimiento_estudiante,
   id_municipio_estudiante, id_tipo_documento_estudiante, id_genero_estudiante,
   direccion_estudiante, email_estudiante)
VALUES
  ('Juan', 'Camilo', 'Pérez', 'Rodríguez',
   '1085123456', '2008-03-15',
   @muni_roldanillo, @dt_ti, @gen_masc,
   'Calle 5 # 4-32 Barrio Centro', 'juan.perez.test@test.local');

SET @student_id = (SELECT id_estudiante FROM estudiante
                   WHERE identificacion_estudiante = '1085123456' LIMIT 1);


-- ── 4. Enrollments (matricula) ──────────────────────────────────────────────
-- One enrollment per academic year, linking the student to each year's group.

INSERT IGNORE INTO matricula
  (id_estudiante_matricula, id_grupo_matricula, fecha_matricula)
VALUES
  (@student_id, @grp_2020, '2020-02-03'),
  (@student_id, @grp_2021, '2021-02-01'),
  (@student_id, @grp_2022, '2022-02-07'),
  (@student_id, @grp_2023, '2023-02-06');

SET @enr_2020 = (SELECT id_matricula FROM matricula
                 WHERE id_estudiante_matricula = @student_id
                   AND id_grupo_matricula = @grp_2020 LIMIT 1);
SET @enr_2021 = (SELECT id_matricula FROM matricula
                 WHERE id_estudiante_matricula = @student_id
                   AND id_grupo_matricula = @grp_2021 LIMIT 1);
SET @enr_2022 = (SELECT id_matricula FROM matricula
                 WHERE id_estudiante_matricula = @student_id
                   AND id_grupo_matricula = @grp_2022 LIMIT 1);
SET @enr_2023 = (SELECT id_matricula FROM matricula
                 WHERE id_estudiante_matricula = @student_id
                   AND id_grupo_matricula = @grp_2023 LIMIT 1);


-- ── 5. Subjects reference ───────────────────────────────────────────────────

SET @sub_mat = (SELECT id_asignatura FROM asignatura WHERE nombre_asignatura = 'Matemáticas'        LIMIT 1);
SET @sub_esp = (SELECT id_asignatura FROM asignatura WHERE nombre_asignatura = 'Español'            LIMIT 1);
SET @sub_nat = (SELECT id_asignatura FROM asignatura WHERE nombre_asignatura = 'Ciencias Naturales' LIMIT 1);
SET @sub_soc = (SELECT id_asignatura FROM asignatura WHERE nombre_asignatura = 'Ciencias Sociales'  LIMIT 1);
SET @sub_ing = (SELECT id_asignatura FROM asignatura WHERE nombre_asignatura = 'Inglés'             LIMIT 1);


-- ── 6. Scores (calificacion) ────────────────────────────────────────────────
-- 5 subjects per enrollment, with rising scores year over year so the
-- progression is visible in get-academic-history. 'nota_habilitacion' is
-- set equal to the original when no remedial was needed, which is the
-- convention this schema uses (the column is NOT NULL).

INSERT IGNORE INTO calificacion
  (nota_original_calificacion, tipo_nota_calificacion,
   id_asignatura_calificacion, nota_habilitacion, id_matricula_calificacion)
VALUES
  -- 2020 / Sexto / 6-A
  ('3.5', 'NUMERICA', @sub_mat, '3.5', @enr_2020),
  ('4.0', 'NUMERICA', @sub_esp, '4.0', @enr_2020),
  ('3.8', 'NUMERICA', @sub_nat, '3.8', @enr_2020),
  ('4.2', 'NUMERICA', @sub_soc, '4.2', @enr_2020),
  ('3.2', 'NUMERICA', @sub_ing, '3.2', @enr_2020),

  -- 2021 / Séptimo / 7-A
  ('4.1', 'NUMERICA', @sub_mat, '4.1', @enr_2021),
  ('4.3', 'NUMERICA', @sub_esp, '4.3', @enr_2021),
  ('4.0', 'NUMERICA', @sub_nat, '4.0', @enr_2021),
  ('4.5', 'NUMERICA', @sub_soc, '4.5', @enr_2021),
  ('3.8', 'NUMERICA', @sub_ing, '3.8', @enr_2021),

  -- 2022 / Séptimo (repeated) / 7-B
  ('4.4', 'NUMERICA', @sub_mat, '4.4', @enr_2022),
  ('4.5', 'NUMERICA', @sub_esp, '4.5', @enr_2022),
  ('4.2', 'NUMERICA', @sub_nat, '4.2', @enr_2022),
  ('4.7', 'NUMERICA', @sub_soc, '4.7', @enr_2022),
  ('4.0', 'NUMERICA', @sub_ing, '4.0', @enr_2022),

  -- 2023 / Octavo / 8-A
  ('4.6', 'NUMERICA', @sub_mat, '4.6', @enr_2023),
  ('4.8', 'NUMERICA', @sub_esp, '4.8', @enr_2023),
  ('4.5', 'NUMERICA', @sub_nat, '4.5', @enr_2023),
  ('4.9', 'NUMERICA', @sub_soc, '4.9', @enr_2023),
  ('4.3', 'NUMERICA', @sub_ing, '4.3', @enr_2023);


-- ── 7. Print the test ids ───────────────────────────────────────────────────
-- Useful when crafting the HTTP requests for manual testing.

SELECT @student_id AS student_id,
       @grp_2020   AS grp_2020, @grp_2021 AS grp_2021,
       @grp_2022   AS grp_2022, @grp_2023 AS grp_2023,
       @enr_2020   AS enr_2020, @enr_2021 AS enr_2021,
       @enr_2022   AS enr_2022, @enr_2023 AS enr_2023;
