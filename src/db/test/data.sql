-- ============================================================================
-- TEST DATA — Expanded Academic Progress Scenario (Colombia Context)
-- ============================================================================
-- Extends the test dataset with 5 realistic Colombian student profiles,
-- diverse academic trajectories (repeating grades, transfers, distinct scores,
-- multiple academic years, and different municipalities), and robust group /
-- enrollment coverage to thoroughly test search, filtering, and history endpoints.
--
-- Endpoints exercised:
--   POST /students/get-course-years       (studentId)
--   POST /students/get-academic-history  (studentId)
--   POST /students/get-scores-by-year    (studentId, year)
--   POST /students/get-scores-by-grade   (studentId, gradeName)
--   POST /certificates/get-by-act-number  (actNumber)   ← format 'YY-NNN'
--   POST /certificates/search-by-act-number (partialActNumber)
--
-- All statements are idempotent (INSERT IGNORE) and rely on natural key
-- resolution. The certificate act numbers follow the auto-generation
-- format enforced by CertificateServices._generateNextActNumber:
--   'YY-NNN'  where YY = last 2 digits of the issue year, and NNN is a
--   3-digit consecutive that RESETS every year and starts at 001.
-- Examples: '20-001', '21-002', '22-003', '24-001'.
-- ============================================================================


-- ── 1. Additional Core Subjects (asignatura) ────────────────────────────────

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


-- ── 2. Reference Catalogs & Institution Setup ───────────────────────────────

SET @inst_id = (SELECT id_institucion FROM institucion WHERE nit_institucion = '891900837-2' LIMIT 1);

-- Grades Reference.
-- IMPORTANT: the ENUM in the 'grado' table uses 'Undécimo' (not 'Once').
-- Using the wrong label silently resolves to NULL and leaves
-- grupo.id_grado_grupo NULL for every '11-A' group.
SET @g_quinto    = (SELECT id_grado FROM grado WHERE nombre_grado = 'Quinto'    LIMIT 1);
SET @g_sexto     = (SELECT id_grado FROM grado WHERE nombre_grado = 'Sexto'     LIMIT 1);
SET @g_septimo   = (SELECT id_grado FROM grado WHERE nombre_grado = 'Séptimo'   LIMIT 1);
SET @g_octavo    = (SELECT id_grado FROM grado WHERE nombre_grado = 'Octavo'    LIMIT 1);
SET @g_noveno    = (SELECT id_grado FROM grado WHERE nombre_grado = 'Noveno'    LIMIT 1);
SET @g_decimo    = (SELECT id_grado FROM grado WHERE nombre_grado = 'Décimo'    LIMIT 1);
SET @g_undecimo  = (SELECT id_grado FROM grado WHERE nombre_grado = 'Undécimo'  LIMIT 1);

-- Document Types & Genders
SET @dt_ti   = (SELECT id_tipo_documento FROM tipo_documento WHERE nombre_tipodocumento = 'Tarjeta de Identidad' LIMIT 1);
SET @dt_cc   = (SELECT id_tipo_documento FROM tipo_documento WHERE nombre_tipodocumento = 'Cédula de Ciudadanía' LIMIT 1);
SET @gen_masc = (SELECT id_genero FROM genero WHERE nombre_genero = 'Masculino' LIMIT 1);
SET @gen_fem  = (SELECT id_genero FROM genero WHERE nombre_genero = 'Femenino'  LIMIT 1);

-- Municipalities (Valle del Cauca).
-- NOTE: every OR must be wrapped so AND stays scoped to the whole city-name
-- group; otherwise 'AND d = Valle' only binds to the second branch.
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
SET @muni_tulua = (
  SELECT m.id_municipio FROM municipio m
  JOIN departamento d ON m.id_departamento = d.id_departamento
  WHERE (m.nombre_municipio = 'Tulua' OR m.nombre_municipio = 'Tuluá')
    AND d.nombre_departamento = 'Valle del Cauca' LIMIT 1
);


-- ── 3. Groups (grupo) ───────────────────────────────────────────────────────
-- Expanded academic cohorts across 2020 - 2024 to support deep filtering tests.

INSERT IGNORE INTO grupo
  (nombre_grupo, anio_grupo, id_grado_grupo, jornada, id_institucion, estado_grupo)
VALUES
  -- Baseline groups
  ('6-A', 2020, @g_sexto,     'Diurna',   @inst_id, 'Activo'),
  ('7-A', 2021, @g_septimo,   'Diurna',   @inst_id, 'Activo'),
  ('7-B', 2022, @g_septimo,   'Diurna',   @inst_id, 'Activo'),
  ('8-A', 2023, @g_octavo,    'Diurna',   @inst_id, 'Activo'),
  -- Additional cohorts
  ('8-B', 2021, @g_octavo,    'Diurna',   @inst_id, 'Activo'),
  ('9-A', 2022, @g_noveno,    'Diurna',   @inst_id, 'Activo'),
  ('9-B', 2023, @g_noveno,    'Diurna',   @inst_id, 'Activo'),
  ('10-A', 2023, @g_decimo,   'Diurna',   @inst_id, 'Activo'),
  ('10-B', 2024, @g_decimo,   'Nocturna', @inst_id, 'Activo'),
  ('11-A', 2024, @g_undecimo, 'Diurna',   @inst_id, 'Activo');

-- Group References
SET @grp_6a_2020  = (SELECT id_grupo FROM grupo WHERE nombre_grupo = '6-A'  AND anio_grupo = 2020 LIMIT 1);
SET @grp_7a_2021  = (SELECT id_grupo FROM grupo WHERE nombre_grupo = '7-A'  AND anio_grupo = 2021 LIMIT 1);
SET @grp_7b_2022  = (SELECT id_grupo FROM grupo WHERE nombre_grupo = '7-B'  AND anio_grupo = 2022 LIMIT 1);
SET @grp_8a_2023  = (SELECT id_grupo FROM grupo WHERE nombre_grupo = '8-A'  AND anio_grupo = 2023 LIMIT 1);
SET @grp_8b_2021  = (SELECT id_grupo FROM grupo WHERE nombre_grupo = '8-B'  AND anio_grupo = 2021 LIMIT 1);
SET @grp_9a_2022  = (SELECT id_grupo FROM grupo WHERE nombre_grupo = '9-A'  AND anio_grupo = 2022 LIMIT 1);
SET @grp_9b_2023  = (SELECT id_grupo FROM grupo WHERE nombre_grupo = '9-B'  AND anio_grupo = 2023 LIMIT 1);
SET @grp_10a_2023 = (SELECT id_grupo FROM grupo WHERE nombre_grupo = '10-A' AND anio_grupo = 2023 LIMIT 1);
SET @grp_10b_2024 = (SELECT id_grupo FROM grupo WHERE nombre_grupo = '10-B' AND anio_grupo = 2024 LIMIT 1);
SET @grp_11a_2024 = (SELECT id_grupo FROM grupo WHERE nombre_grupo = '11-A' AND anio_grupo = 2024 LIMIT 1);


-- ── 4. Students (estudiante) ────────────────────────────────────────────────
-- All names are single-word strings without spaces to comply with regex validation: [\p{L}]{3,50}

INSERT IGNORE INTO estudiante
  (primer_nombre_estudiante, segundo_nombre_estudiante,
   primer_apellido_estudiante, segundo_apellido_estudiante,
   identificacion_estudiante, fecha_nacimiento_estudiante,
   id_municipio_estudiante, id_tipo_documento_estudiante, id_genero_estudiante,
   direccion_estudiante, email_estudiante)
VALUES
  -- 1. Juan Camilo Pérez Rodríguez (Baseline repeat scenario)
  ('Juan', 'Camilo', 'Pérez', 'Rodríguez',
   '1085123456', '2008-03-15',
   @muni_roldanillo, @dt_ti, @gen_masc,
   'Calle 5 # 4-32 Barrio Centro', 'juan.perez.test@test.local'),

  -- 2. Valentina María Restrepo Gómez (High-performing student, 2021-2024 progression)
  ('Valentina', 'María', 'Restrepo', 'Gómez',
   '1085987654', '2007-08-22',
   @muni_cali, @dt_ti, @gen_fem,
   'Carrera 15 # 8-45 Barrio Granada', 'valentina.restrepo.test@test.local'),

  -- 3. Santiago Andrés Caicedo Mosquera (Transferred student, late enrollment)
  ('Santiago', 'Andrés', 'Caicedo', 'Mosquera',
   '1085456789', '2006-11-05',
   @muni_palmira, @dt_cc, @gen_masc,
   'Calle 12 # 22-10 Barrio Las Mercedes', 'santiago.caicedo.test@test.local'),

  -- 4. Mariana Lucía Osorio Bermúdez (Repeated 9th grade scenario)
  ('Mariana', 'Lucía', 'Osorio', 'Bermúdez',
   '1085112233', '2007-01-30',
   @muni_roldanillo, @dt_ti, @gen_fem,
   'Carrera 4 # 10-18 Barrio El Carmen', 'mariana.osorio.test@test.local'),

  -- 5. Mateo Esteban Morales Agudelo (Night shift student)
  ('Mateo', 'Esteban', 'Morales', 'Agudelo',
   '1085667788', '2005-05-19',
   @muni_roldanillo, @dt_cc, @gen_masc,
   'Calle 8 # 3-50 Barrio San Antonio', 'mateo.morales.test@test.local');

-- Student ID References
SET @st_juan      = (SELECT id_estudiante FROM estudiante WHERE identificacion_estudiante = '1085123456' LIMIT 1);
SET @st_valentina = (SELECT id_estudiante FROM estudiante WHERE identificacion_estudiante = '1085987654' LIMIT 1);
SET @st_santiago  = (SELECT id_estudiante FROM estudiante WHERE identificacion_estudiante = '1085456789' LIMIT 1);
SET @st_mariana   = (SELECT id_estudiante FROM estudiante WHERE identificacion_estudiante = '1085112233' LIMIT 1);
SET @st_mateo     = (SELECT id_estudiante FROM estudiante WHERE identificacion_estudiante = '1085667788' LIMIT 1);


-- ── 5. Enrollments (matricula) ──────────────────────────────────────────────

INSERT IGNORE INTO matricula
  (id_estudiante_matricula, id_grupo_matricula, fecha_matricula)
VALUES
  -- Juan Camilo
  (@st_juan, @grp_6a_2020, '2020-02-03'),
  (@st_juan, @grp_7a_2021, '2021-02-01'),
  (@st_juan, @grp_7b_2022, '2022-02-07'),
  (@st_juan, @grp_8a_2023, '2023-02-06'),

  -- Valentina (8th to 11th grade)
  (@st_valentina, @grp_8b_2021,  '2021-02-01'),
  (@st_valentina, @grp_9a_2022,  '2022-02-01'),
  (@st_valentina, @grp_10a_2023, '2023-02-01'),
  (@st_valentina, @grp_11a_2024, '2024-02-05'),

  -- Santiago (9th to 10th grade)
  (@st_santiago, @grp_9b_2023,  '2023-02-10'),
  (@st_santiago, @grp_10b_2024, '2024-02-12'),

  -- Mariana (Repeated Noveno in 2022 & 2023)
  (@st_mariana, @grp_9a_2022,  '2022-02-05'),
  (@st_mariana, @grp_9b_2023,  '2023-02-08'),
  (@st_mariana, @grp_10a_2024, '2024-02-06'),

  -- Mateo (10th grade Night shift)
  (@st_mateo, @grp_10b_2024, '2024-02-15');

-- Enrollment References
SET @enr_juan_2020 = (SELECT id_matricula FROM matricula WHERE id_estudiante_matricula = @st_juan AND id_grupo_matricula = @grp_6a_2020 LIMIT 1);
SET @enr_juan_2021 = (SELECT id_matricula FROM matricula WHERE id_estudiante_matricula = @st_juan AND id_grupo_matricula = @grp_7a_2021 LIMIT 1);
SET @enr_juan_2022 = (SELECT id_matricula FROM matricula WHERE id_estudiante_matricula = @st_juan AND id_grupo_matricula = @grp_7b_2022 LIMIT 1);
SET @enr_juan_2023 = (SELECT id_matricula FROM matricula WHERE id_estudiante_matricula = @st_juan AND id_grupo_matricula = @grp_8a_2023 LIMIT 1);

SET @enr_val_2021  = (SELECT id_matricula FROM matricula WHERE id_estudiante_matricula = @st_valentina AND id_grupo_matricula = @grp_8b_2021 LIMIT 1);
SET @enr_val_2022  = (SELECT id_matricula FROM matricula WHERE id_estudiante_matricula = @st_valentina AND id_grupo_matricula = @grp_9a_2022 LIMIT 1);
SET @enr_val_2023  = (SELECT id_matricula FROM matricula WHERE id_estudiante_matricula = @st_valentina AND id_grupo_matricula = @grp_10a_2023 LIMIT 1);
SET @enr_val_2024  = (SELECT id_matricula FROM matricula WHERE id_estudiante_matricula = @st_valentina AND id_grupo_matricula = @grp_11a_2024 LIMIT 1);

SET @enr_sant_2023 = (SELECT id_matricula FROM matricula WHERE id_estudiante_matricula = @st_santiago AND id_grupo_matricula = @grp_9b_2023 LIMIT 1);
SET @enr_sant_2024 = (SELECT id_matricula FROM matricula WHERE id_estudiante_matricula = @st_santiago AND id_grupo_matricula = @grp_10b_2024 LIMIT 1);

SET @enr_mar_2022  = (SELECT id_matricula FROM matricula WHERE id_estudiante_matricula = @st_mariana AND id_grupo_matricula = @grp_9a_2022 LIMIT 1);
SET @enr_mar_2023  = (SELECT id_matricula FROM matricula WHERE id_estudiante_matricula = @st_mariana AND id_grupo_matricula = @grp_9b_2023 LIMIT 1);
SET @enr_mar_2024  = (SELECT id_matricula FROM matricula WHERE id_estudiante_matricula = @st_mariana AND id_grupo_matricula = @grp_10a_2024 LIMIT 1);

SET @enr_mat_2024  = (SELECT id_matricula FROM matricula WHERE id_estudiante_matricula = @st_mateo AND id_grupo_matricula = @grp_10b_2024 LIMIT 1);


-- ── 6. Subject References ───────────────────────────────────────────────────

SET @sub_mat = (SELECT id_asignatura FROM asignatura WHERE nombre_asignatura = 'Matemáticas'         LIMIT 1);
SET @sub_esp = (SELECT id_asignatura FROM asignatura WHERE nombre_asignatura = 'Español'             LIMIT 1);
SET @sub_nat = (SELECT id_asignatura FROM asignatura WHERE nombre_asignatura = 'Ciencias Naturales'  LIMIT 1);
SET @sub_soc = (SELECT id_asignatura FROM asignatura WHERE nombre_asignatura = 'Ciencias Sociales'   LIMIT 1);
SET @sub_ing = (SELECT id_asignatura FROM asignatura WHERE nombre_asignatura = 'Inglés'              LIMIT 1);
SET @sub_qui = (SELECT id_asignatura FROM asignatura WHERE nombre_asignatura = 'Química'             LIMIT 1);
SET @sub_fis = (SELECT id_asignatura FROM asignatura WHERE nombre_asignatura = 'Física'              LIMIT 1);
SET @sub_fil = (SELECT id_asignatura FROM asignatura WHERE nombre_asignatura = 'Filosofía'           LIMIT 1);


-- ── 7. Scores (calificacion) ────────────────────────────────────────────────

INSERT IGNORE INTO calificacion
  (nota_original_calificacion, tipo_nota_calificacion, id_asignatura_calificacion, nota_habilitacion, id_matricula_calificacion)
VALUES
  -- --------------------------------------------------------------------------
  -- Juan Camilo Pérez
  -- --------------------------------------------------------------------------
  ('3.5', 'NUMERICA', @sub_mat, '3.5', @enr_juan_2020),
  ('4.0', 'NUMERICA', @sub_esp, '4.0', @enr_juan_2020),
  ('3.8', 'NUMERICA', @sub_nat, '3.8', @enr_juan_2020),
  ('4.2', 'NUMERICA', @sub_soc, '4.2', @enr_juan_2020),
  ('3.2', 'NUMERICA', @sub_ing, '3.2', @enr_juan_2020),

  ('4.1', 'NUMERICA', @sub_mat, '4.1', @enr_juan_2021),
  ('4.3', 'NUMERICA', @sub_esp, '4.3', @enr_juan_2021),
  ('4.0', 'NUMERICA', @sub_nat, '4.0', @enr_juan_2021),
  ('4.5', 'NUMERICA', @sub_soc, '4.5', @enr_juan_2021),
  ('3.8', 'NUMERICA', @sub_ing, '3.8', @enr_juan_2021),

  ('4.4', 'NUMERICA', @sub_mat, '4.4', @enr_juan_2022),
  ('4.5', 'NUMERICA', @sub_esp, '4.5', @enr_juan_2022),
  ('4.2', 'NUMERICA', @sub_nat, '4.2', @enr_juan_2022),
  ('4.7', 'NUMERICA', @sub_soc, '4.7', @enr_juan_2022),
  ('4.0', 'NUMERICA', @sub_ing, '4.0', @enr_juan_2022),

  ('4.6', 'NUMERICA', @sub_mat, '4.6', @enr_juan_2023),
  ('4.8', 'NUMERICA', @sub_esp, '4.8', @enr_juan_2023),
  ('4.5', 'NUMERICA', @sub_nat, '4.5', @enr_juan_2023),
  ('4.9', 'NUMERICA', @sub_soc, '4.9', @enr_juan_2023),
  ('4.3', 'NUMERICA', @sub_ing, '4.3', @enr_juan_2023),

  -- --------------------------------------------------------------------------
  -- Valentina Restrepo (High academic performance)
  -- --------------------------------------------------------------------------
  ('4.8', 'NUMERICA', @sub_mat, '4.8', @enr_val_2021),
  ('4.9', 'NUMERICA', @sub_esp, '4.9', @enr_val_2021),
  ('4.7', 'NUMERICA', @sub_nat, '4.7', @enr_val_2021),

  ('4.9', 'NUMERICA', @sub_mat, '4.9', @enr_val_2022),
  ('5.0', 'NUMERICA', @sub_esp, '5.0', @enr_val_2022),
  ('4.8', 'NUMERICA', @sub_ing, '4.8', @enr_val_2022),

  ('4.7', 'NUMERICA', @sub_mat, '4.7', @enr_val_2023),
  ('4.6', 'NUMERICA', @sub_qui, '4.6', @enr_val_2023),
  ('4.8', 'NUMERICA', @sub_fis, '4.8', @enr_val_2023),

  ('5.0', 'NUMERICA', @sub_mat, '5.0', @enr_val_2024),
  ('4.9', 'NUMERICA', @sub_fil, '4.9', @enr_val_2024),
  ('5.0', 'NUMERICA', @sub_ing, '5.0', @enr_val_2024),

  -- --------------------------------------------------------------------------
  -- Santiago Caicedo (Remedial exam / 'habilitación' case)
  -- --------------------------------------------------------------------------
  ('2.5', 'NUMERICA', @sub_mat, '3.5', @enr_sant_2023), -- failed original, passed remedial
  ('3.8', 'NUMERICA', @sub_esp, '3.8', @enr_sant_2023),

  ('3.2', 'NUMERICA', @sub_mat, '3.2', @enr_sant_2024),
  ('2.8', 'NUMERICA', @sub_qui, '3.0', @enr_sant_2024), -- remedial pass

  -- --------------------------------------------------------------------------
  -- Mariana Osorio (Repeat grade Noveno with improvement)
  -- --------------------------------------------------------------------------
  ('2.0', 'NUMERICA', @sub_mat, '2.8', @enr_mar_2022), -- failed year
  ('3.0', 'NUMERICA', @sub_esp, '3.0', @enr_mar_2022),

  ('3.8', 'NUMERICA', @sub_mat, '3.8', @enr_mar_2023), -- repeated year passed
  ('4.1', 'NUMERICA', @sub_esp, '4.1', @enr_mar_2023),

  ('4.0', 'NUMERICA', @sub_mat, '4.0', @enr_mar_2024),

  -- --------------------------------------------------------------------------
  -- Mateo Morales (Night shift student)
  -- --------------------------------------------------------------------------
  ('3.5', 'NUMERICA', @sub_mat, '3.5', @enr_mat_2024),
  ('3.7', 'NUMERICA', @sub_esp, '3.7', @enr_mat_2024),
  ('4.0', 'NUMERICA', @sub_fil, '4.0', @enr_mat_2024);


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
--
-- Each phone number is UNIQUE (see migration 20260709204527-phone.cjs).
-- Mobile format: 10 digits starting with 3. Landline: 7-10 digits, optional
-- '+57' prefix. All numbers below match the phoneNumber RegEx.
--
-- Ownership plan (single-owner rule — one phone belongs to exactly ONE actor):
--   - 6 student phones    → estudiante_telefono
--   - 5 user phones       → usuario_telefono
--   - 2 institution phones → institucion_telefono
--   - 3 recipient phones  → receptor_certificado_telefono

INSERT IGNORE INTO telefono (numero_telefono) VALUES
  -- Student mobiles (one primary line per student, plus one landline for Juan)
  ('3001234567'),   -- Juan's mobile
  ('6022345678'),   -- Juan's home landline
  ('3109876543'),   -- Valentina
  ('3205551234'),   -- Santiago
  ('3018765432'),   -- Mariana
  ('3123334455'),   -- Mateo
  -- User mobiles (one per staff account)
  ('3157778899'),   -- master
  ('3004445566'),   -- auxiliar
  ('3189990011'),   -- administrador
  ('3115554433'),   -- funcionario
  ('3006665544'),   -- rector
  -- Institution landlines (main + alternate)
  ('6028889900'),   -- institution main
  ('6028889901'),   -- institution alternate
  -- Certificate recipient mobiles (one per acudiente)
  ('3112223344'),   -- Carlos Pérez
  ('3206667788'),   -- Lucía Rodríguez
  ('3007776655');   -- Andrés Morales

-- Phone ID references
SET @tel_juan_mobile   = (SELECT id_telefono FROM telefono WHERE numero_telefono = '3001234567' LIMIT 1);
SET @tel_juan_home     = (SELECT id_telefono FROM telefono WHERE numero_telefono = '6022345678' LIMIT 1);
SET @tel_valentina     = (SELECT id_telefono FROM telefono WHERE numero_telefono = '3109876543' LIMIT 1);
SET @tel_santiago      = (SELECT id_telefono FROM telefono WHERE numero_telefono = '3205551234' LIMIT 1);
SET @tel_mariana       = (SELECT id_telefono FROM telefono WHERE numero_telefono = '3018765432' LIMIT 1);
SET @tel_mateo         = (SELECT id_telefono FROM telefono WHERE numero_telefono = '3123334455' LIMIT 1);

SET @tel_master        = (SELECT id_telefono FROM telefono WHERE numero_telefono = '3157778899' LIMIT 1);
SET @tel_auxiliar      = (SELECT id_telefono FROM telefono WHERE numero_telefono = '3004445566' LIMIT 1);
SET @tel_admin         = (SELECT id_telefono FROM telefono WHERE numero_telefono = '3189990011' LIMIT 1);
SET @tel_funcionario   = (SELECT id_telefono FROM telefono WHERE numero_telefono = '3115554433' LIMIT 1);
SET @tel_rector        = (SELECT id_telefono FROM telefono WHERE numero_telefono = '3006665544' LIMIT 1);

SET @tel_inst_main     = (SELECT id_telefono FROM telefono WHERE numero_telefono = '6028889900' LIMIT 1);
SET @tel_inst_alt      = (SELECT id_telefono FROM telefono WHERE numero_telefono = '6028889901' LIMIT 1);

SET @tel_rec_carlos    = (SELECT id_telefono FROM telefono WHERE numero_telefono = '3112223344' LIMIT 1);
SET @tel_rec_lucia     = (SELECT id_telefono FROM telefono WHERE numero_telefono = '3206667788' LIMIT 1);
SET @tel_rec_andres    = (SELECT id_telefono FROM telefono WHERE numero_telefono = '3007776655' LIMIT 1);


-- ── 10. Certificate Recipients (receptor_certificado) ───────────────────────
--
-- Acudientes / authorized recipients who can pick up certificates on behalf
-- of the student. Each document number is UNIQUE. Middle names are NULL
-- where the recipient has none (Lucía), matching the nullable column.

INSERT IGNORE INTO receptor_certificado
  (nombre_receptor_certificado, segundo_nombre_receptor_certificado,
   apellidos_receptor_certificado, segundo_apellido_receptor_certificado,
   id_tipodocumento_receptor_certificado, identificacion_receptor_certificado,
   direccion_receptor_certificado)
VALUES
  ('Carlos', 'Andrés', 'Pérez',    'Gómez',    @dt_cc, '16345678', 'Calle 5 # 4-32 Barrio Centro'),
  ('Lucía',  NULL,     'Rodríguez', 'Vargas',  @dt_cc, '52456789', 'Carrera 15 # 8-45 Barrio Granada'),
  ('Andrés', 'Felipe', 'Morales',  'Restrepo', @dt_cc, '79456123', 'Calle 12 # 22-10 Barrio Las Mercedes');

-- Certificate recipient ID references
SET @rec_carlos = (SELECT id_receptor_certificado FROM receptor_certificado WHERE identificacion_receptor_certificado = '16345678' LIMIT 1);
SET @rec_lucia  = (SELECT id_receptor_certificado FROM receptor_certificado WHERE identificacion_receptor_certificado = '52456789' LIMIT 1);
SET @rec_andres = (SELECT id_receptor_certificado FROM receptor_certificado WHERE identificacion_receptor_certificado = '79456123' LIMIT 1);


-- ── 11. User-Phone links (usuario_telefono) ────────────────────────────────

SET @usr_master      = (SELECT id_usuario FROM usuario WHERE email_usuario = 'master.dev@test.local'      LIMIT 1);
SET @usr_auxiliar    = (SELECT id_usuario FROM usuario WHERE email_usuario = 'auxiliar.dev@test.local'    LIMIT 1);
SET @usr_admin       = (SELECT id_usuario FROM usuario WHERE email_usuario = 'admin.dev@test.local'       LIMIT 1);
SET @usr_funcionario = (SELECT id_usuario FROM usuario WHERE email_usuario = 'funcionario.dev@test.local' LIMIT 1);
SET @usr_rector      = (SELECT id_usuario FROM usuario WHERE email_usuario = 'rector.dev@test.local'      LIMIT 1);

INSERT IGNORE INTO usuario_telefono (id_usuario, id_telefono) VALUES
  (@usr_master,      @tel_master),
  (@usr_auxiliar,    @tel_auxiliar),
  (@usr_admin,       @tel_admin),
  (@usr_funcionario, @tel_funcionario),
  (@usr_rector,      @tel_rector);


-- ── 12. Student-Phone links (estudiante_telefono) ──────────────────────────

INSERT IGNORE INTO estudiante_telefono (id_estudiante, id_telefono) VALUES
  (@st_juan,      @tel_juan_mobile),
  (@st_juan,      @tel_juan_home),
  (@st_valentina, @tel_valentina),
  (@st_santiago,  @tel_santiago),
  (@st_mariana,   @tel_mariana),
  (@st_mateo,     @tel_mateo);


-- ── 13. Institution-Phone links (institucion_telefono) ─────────────────────

INSERT IGNORE INTO institucion_telefono (id_institucion, id_telefono) VALUES
  (@inst_id, @tel_inst_main),
  (@inst_id, @tel_inst_alt);


-- ── 14. CertificateRecipient-Phone links (receptor_certificado_telefono) ───

INSERT IGNORE INTO receptor_certificado_telefono (id_receptor_certificado, id_telefono) VALUES
  (@rec_carlos, @tel_rec_carlos),
  (@rec_lucia,  @tel_rec_lucia),
  (@rec_andres, @tel_rec_andres);


-- ── 15. Summary Query — Phone Ownership ────────────────────────────────────

SELECT 'usuario' AS tipo_propietario,
       u.alias_usuario AS propietario,
       t.numero_telefono AS telefono
FROM usuario_telefono ut
JOIN usuario u  ON ut.id_usuario = u.id_usuario
JOIN telefono t ON ut.id_telefono = t.id_telefono

UNION ALL

SELECT 'estudiante',
       CONCAT(e.primer_nombre_estudiante, ' ', e.primer_apellido_estudiante),
       t.numero_telefono
FROM estudiante_telefono et
JOIN estudiante e ON et.id_estudiante = e.id_estudiante
JOIN telefono t   ON et.id_telefono = t.id_telefono

UNION ALL

SELECT 'institucion',
       i.nombre_institucion,
       t.numero_telefono
FROM institucion_telefono it
JOIN institucion i ON it.id_institucion = i.id_institucion
JOIN telefono t    ON it.id_telefono = t.id_telefono

UNION ALL

SELECT 'receptor_certificado',
       CONCAT(r.nombre_receptor_certificado, ' ', r.apellidos_receptor_certificado),
       t.numero_telefono
FROM receptor_certificado_telefono rt
JOIN receptor_certificado r ON rt.id_receptor_certificado = r.id_receptor_certificado
JOIN telefono t             ON rt.id_telefono = t.id_telefono

ORDER BY tipo_propietario, propietario;


-- ── 16. Certificates per enrollment (NEW ACT NUMBER FORMAT 'YY-NNN') ────────
-- Requires @usr_master (issuing user), @inst_id, @rec_* and @enr_* — all
-- already set by the earlier blocks. One certificate per enrollment
-- (certificado.id_matricula_certificado has a UNIQUE constraint).
-- estado_certificado ∈ {'EMITIDO','ANULADO','REIMPRESO'}.
--
-- ACT-NUMBER FORMAT:
--   'YY-NNN'  — YY is the last 2 digits of the ISSUE YEAR, and NNN is a
--   3-digit consecutive that resets every year and starts at 001.
--   Must match certificateActNumber = /^\d{2}-\d{3}$/ (see
--   src/utils/RegEx/certificateRegEx.js) and the auto-generation logic
--   in CertificateServices._generateNextActNumber.
--
-- YEAR-BY-YEAR CONSECUTIVE MAP (as used below):
--   2020 → 20-001                     (1 cert)
--   2021 → 21-001, 21-002             (2 certs)
--   2022 → 22-001, 22-002, 22-003     (3 certs)
--   2023 → 23-001, 23-002, 23-003, 23-004  (4 certs)
--   2024 → 24-001, 24-002, 24-003     (3 certs)

SET @usr_master = (
  SELECT id_usuario FROM usuario
  WHERE email_usuario = 'master.dev@test.local' LIMIT 1
);

INSERT IGNORE INTO certificado
  (numero_acta_certificado,
   fecha_emision_certificado,
   id_usuario_certificado,
   id_institucion_certificado,
   id_matricula_certificado,
   id_receptor_certificado,
   estado_certificado)
VALUES
  -- ── Juan Camilo Pérez (4 matriculas → 4 certificates) ──────────────────
  -- 2020: first cert of the year
  ('20-001', '2020-11-30', @usr_master, @inst_id, @enr_juan_2020, @rec_carlos, 'EMITIDO'),
  -- 2021: first cert of the year
  ('21-001', '2021-11-30', @usr_master, @inst_id, @enr_juan_2021, @rec_carlos, 'EMITIDO'),
  -- 2022: first cert of the year
  ('22-001', '2022-11-30', @usr_master, @inst_id, @enr_juan_2022, @rec_lucia,  'EMITIDO'),
  -- 2023: first cert of the year
  ('23-001', '2023-12-05', @usr_master, @inst_id, @enr_juan_2023, @rec_carlos, 'EMITIDO'),

  -- ── Valentina Restrepo (8° → 11°) ──────────────────────────────────────
  -- 2021: second cert of the year
  ('21-002', '2021-11-30', @usr_master, @inst_id, @enr_val_2021,  @rec_lucia,  'EMITIDO'),
  -- 2022: second cert of the year
  ('22-002', '2022-11-30', @usr_master, @inst_id, @enr_val_2022,  @rec_lucia,  'EMITIDO'),
  -- 2023: second cert of the year
  ('23-002', '2023-11-30', @usr_master, @inst_id, @enr_val_2023,  @rec_lucia,  'EMITIDO'),
  -- 2024: first cert of the year
  ('24-001', '2024-11-15', @usr_master, @inst_id, @enr_val_2024,  @rec_lucia,  'EMITIDO'),

  -- ── Santiago Caicedo (transfer + remedial) ─────────────────────────────
  -- 2023: third cert of the year
  ('23-003', '2023-02-15', @usr_master, @inst_id, @enr_sant_2023, @rec_carlos, 'EMITIDO'),
  -- 2024: second cert of the year
  ('24-002', '2024-11-30', @usr_master, @inst_id, @enr_sant_2024, @rec_carlos, 'EMITIDO'),

  -- ── Mariana Osorio (repeated 9°) ───────────────────────────────────────
  -- 2022: third cert of the year — failed year → ANULADO
  ('22-003', '2022-11-30', @usr_master, @inst_id, @enr_mar_2022,  @rec_lucia,  'ANULADO'),
  -- 2023: fourth cert of the year — approved → EMITIDO
  ('23-004', '2023-11-30', @usr_master, @inst_id, @enr_mar_2023,  @rec_lucia,  'EMITIDO'),
  -- 2024: fourth cert of the year — promoted → EMITIDO
  ('24-003', '2024-11-30', @usr_master, @inst_id, @enr_mar_2024,  @rec_lucia,  'EMITIDO'),

  -- ── Mateo Morales (night shift) ────────────────────────────────────────
  -- 2024: fifth cert of the year
  ('24-004', '2024-02-20', @usr_master, @inst_id, @enr_mat_2024,  @rec_andres, 'EMITIDO');


-- ── 17. Verification — Certificates with student / grade / group ────────────
--
-- Confirms the format 'YY-NNN' is respected and every certificate links to
-- a real student, grade, group and recipient.

SELECT c.id_certificado,
       c.numero_acta_certificado,
       c.estado_certificado,
       c.fecha_emision_certificado,
       CONCAT(e.primer_nombre_estudiante, ' ', e.primer_apellido_estudiante) AS estudiante,
       gr.nombre_grado,
       g.anio_grupo,
       g.nombre_grupo,
       g.jornada,
       CONCAT(r.nombre_receptor_certificado, ' ', r.apellidos_receptor_certificado) AS receptor
FROM certificado c
JOIN matricula  m  ON c.id_matricula_certificado = m.id_matricula
JOIN estudiante e  ON m.id_estudiante_matricula  = e.id_estudiante
JOIN grupo      g  ON m.id_grupo_matricula       = g.id_grupo
JOIN grado      gr ON g.id_grado_grupo           = gr.id_grado
LEFT JOIN receptor_certificado r ON c.id_receptor_certificado = r.id_receptor_certificado
ORDER BY c.numero_acta_certificado;

-- Expected output (13 rows, one per seeded certificate):
--
-- numero_acta | estudiante        | grado     | anio | grupo | jornada   | estado
-- ------------+-------------------+-----------+------+-------+-----------+---------
-- 20-001      | Juan Pérez        | Sexto     | 2020 | 6-A   | Diurna    | EMITIDO
-- 21-001      | Juan Pérez        | Séptimo   | 2021 | 7-A   | Diurna    | EMITIDO
-- 21-002      | Valentina Restrepo| Octavo    | 2021 | 8-B   | Diurna    | EMITIDO
-- 22-001      | Juan Pérez        | Séptimo   | 2022 | 7-B   | Diurna    | EMITIDO
-- 22-002      | Valentina Restrepo| Noveno    | 2022 | 9-A   | Diurna    | EMITIDO
-- 22-003      | Mariana Osorio    | Noveno    | 2022 | 9-A   | Diurna    | ANULADO
-- 23-001      | Juan Pérez        | Octavo    | 2023 | 8-A   | Diurna    | EMITIDO
-- 23-002      | Valentina Restrepo| Décimo    | 2023 | 10-A  | Diurna    | EMITIDO
-- 23-003      | Santiago Caicedo  | Noveno    | 2023 | 9-B   | Diurna    | EMITIDO
-- 23-004      | Mariana Osorio    | Noveno    | 2023 | 9-B   | Diurna    | EMITIDO
-- 24-001      | Valentina Restrepo| Undécimo  | 2024 | 11-A  | Diurna    | EMITIDO
-- 24-002      | Santiago Caicedo  | Décimo    | 2024 | 10-B  | Nocturna  | EMITIDO
-- 24-003      | Mariana Osorio    | Décimo    | 2024 | 10-A  | Diurna    | EMITIDO
-- 24-004      | Mateo Morales     | Décimo    | 2024 | 10-B  | Nocturna  | EMITIDO
