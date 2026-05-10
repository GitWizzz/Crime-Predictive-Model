-- =============================================================================
-- FULL SEED: Crime Predictive Model — crime_hotspot_db
-- Run with: psql -U postgres -d crime_hotspot_db -f seed_full.sql
-- =============================================================================

BEGIN;

-- =============================================================================
-- STEP 0: Fix existing location key format (latitude/longitude → lat/lon)
-- Views use location->>'lat' and location->>'lon'
-- =============================================================================

UPDATE firs
SET location = jsonb_build_object(
  'lat', (location->>'latitude')::float,
  'lon', (location->>'longitude')::float
)
WHERE location ? 'latitude';

UPDATE irad_accidents
SET location = jsonb_build_object(
  'lat', (location->>'latitude')::float,
  'lon', (location->>'longitude')::float
)
WHERE location ? 'latitude';


-- =============================================================================
-- STEP 1: USERS — replace placeholder accounts with real Bihar Police data
-- =============================================================================

TRUNCATE users RESTART IDENTITY CASCADE;

INSERT INTO users (name, email, password_hash, role, police_station, zone, is_active, created_at) VALUES
-- ADMINs
('Superintendent of Police, Patna',  'sp.patna@bihar.gov.in',       '$2b$12$KzT1HVtAWi3OUZ7Fk/CbVeP0n2mQ8rX1sHwDyL4jN6vB9cM5eIuKa', 'ADMIN',   NULL,                'Patna',         TRUE, NOW() - INTERVAL '180 days'),
('SP Gaya',                          'sp.gaya@bihar.gov.in',         '$2b$12$KzT1HVtAWi3OUZ7Fk/CbVeP0n2mQ8rX1sHwDyL4jN6vB9cM5eIuKa', 'ADMIN',   NULL,                'Gaya',           TRUE, NOW() - INTERVAL '180 days'),
('SP Muzaffarpur',                   'sp.muzaffarpur@bihar.gov.in',  '$2b$12$KzT1HVtAWi3OUZ7Fk/CbVeP0n2mQ8rX1sHwDyL4jN6vB9cM5eIuKa', 'ADMIN',   NULL,                'Muzaffarpur',    TRUE, NOW() - INTERVAL '180 days'),
('SP Bhagalpur',                     'sp.bhagalpur@bihar.gov.in',    '$2b$12$KzT1HVtAWi3OUZ7Fk/CbVeP0n2mQ8rX1sHwDyL4jN6vB9cM5eIuKa', 'ADMIN',   NULL,                'Bhagalpur',      TRUE, NOW() - INTERVAL '180 days'),
('System Administrator',             'admin@crimemap.bihar.gov.in',  '$2b$12$KzT1HVtAWi3OUZ7Fk/CbVeP0n2mQ8rX1sHwDyL4jN6vB9cM5eIuKa', 'ADMIN',   NULL,                NULL,             TRUE, NOW() - INTERVAL '200 days'),

-- ANALYSTs
('Rahul Mishra',         'rahul.mishra@bihar.gov.in',     '$2b$12$KzT1HVtAWi3OUZ7Fk/CbVeP0n2mQ8rX1sHwDyL4jN6vB9cM5eIuKa', 'ANALYST', NULL,              'Patna',          TRUE, NOW() - INTERVAL '120 days'),
('Priya Sinha',          'priya.sinha@bihar.gov.in',      '$2b$12$KzT1HVtAWi3OUZ7Fk/CbVeP0n2mQ8rX1sHwDyL4jN6vB9cM5eIuKa', 'ANALYST', NULL,              'Muzaffarpur',    TRUE, NOW() - INTERVAL '100 days'),
('Ajay Kumar',           'ajay.kumar@bihar.gov.in',       '$2b$12$KzT1HVtAWi3OUZ7Fk/CbVeP0n2mQ8rX1sHwDyL4jN6vB9cM5eIuKa', 'ANALYST', NULL,              'Gaya',           TRUE, NOW() - INTERVAL '90 days'),
('Sunita Devi',          'sunita.devi@bihar.gov.in',      '$2b$12$KzT1HVtAWi3OUZ7Fk/CbVeP0n2mQ8rX1sHwDyL4jN6vB9cM5eIuKa', 'ANALYST', NULL,              'Bhagalpur',      TRUE, NOW() - INTERVAL '80 days'),
('Vikram Prasad',        'vikram.prasad@bihar.gov.in',    '$2b$12$KzT1HVtAWi3OUZ7Fk/CbVeP0n2mQ8rX1sHwDyL4jN6vB9cM5eIuKa', 'ANALYST', NULL,              'Darbhanga',      TRUE, NOW() - INTERVAL '60 days'),

-- OFFICERs — Patna
('SI Rajesh Kumar',      'rajesh.kumar@bihar.gov.in',     '$2b$12$KzT1HVtAWi3OUZ7Fk/CbVeP0n2mQ8rX1sHwDyL4jN6vB9cM5eIuKa', 'OFFICER', 'Kotwali PS',      'Patna',          TRUE, NOW() - INTERVAL '150 days'),
('SI Manoj Singh',       'manoj.singh@bihar.gov.in',      '$2b$12$KzT1HVtAWi3OUZ7Fk/CbVeP0n2mQ8rX1sHwDyL4jN6vB9cM5eIuKa', 'OFFICER', 'Kankarbagh PS',   'Patna',          TRUE, NOW() - INTERVAL '140 days'),
('ASI Deepak Yadav',     'deepak.yadav@bihar.gov.in',     '$2b$12$KzT1HVtAWi3OUZ7Fk/CbVeP0n2mQ8rX1sHwDyL4jN6vB9cM5eIuKa', 'OFFICER', 'Civil Lines PS',  'Patna',          TRUE, NOW() - INTERVAL '130 days'),
('SI Anita Kumari',      'anita.kumari@bihar.gov.in',     '$2b$12$KzT1HVtAWi3OUZ7Fk/CbVeP0n2mQ8rX1sHwDyL4jN6vB9cM5eIuKa', 'OFFICER', 'Pirbahore PS',    'Patna',          TRUE, NOW() - INTERVAL '110 days'),
('ASI Suresh Paswan',    'suresh.paswan@bihar.gov.in',    '$2b$12$KzT1HVtAWi3OUZ7Fk/CbVeP0n2mQ8rX1sHwDyL4jN6vB9cM5eIuKa', 'OFFICER', 'Gardanibagh PS',  'Patna',          TRUE, NOW() - INTERVAL '100 days'),
('SI Ravi Shankar',      'ravi.shankar@bihar.gov.in',     '$2b$12$KzT1HVtAWi3OUZ7Fk/CbVeP0n2mQ8rX1sHwDyL4jN6vB9cM5eIuKa', 'OFFICER', 'Danapur PS',      'Patna',          TRUE, NOW() - INTERVAL '95 days'),
-- OFFICERs — Gaya
('SI Ramesh Sharma',     'ramesh.sharma@bihar.gov.in',    '$2b$12$KzT1HVtAWi3OUZ7Fk/CbVeP0n2mQ8rX1sHwDyL4jN6vB9cM5eIuKa', 'OFFICER', 'Gaya Town PS',    'Gaya',           TRUE, NOW() - INTERVAL '85 days'),
('ASI Pooja Jha',        'pooja.jha@bihar.gov.in',        '$2b$12$KzT1HVtAWi3OUZ7Fk/CbVeP0n2mQ8rX1sHwDyL4jN6vB9cM5eIuKa', 'OFFICER', 'Bodh Gaya PS',    'Gaya',           TRUE, NOW() - INTERVAL '75 days'),
-- OFFICERs — Muzaffarpur
('SI Arun Tiwari',       'arun.tiwari@bihar.gov.in',      '$2b$12$KzT1HVtAWi3OUZ7Fk/CbVeP0n2mQ8rX1sHwDyL4jN6vB9cM5eIuKa', 'OFFICER', 'Muzaffarpur Town PS','Muzaffarpur', TRUE, NOW() - INTERVAL '70 days'),
('SI Rekha Singh',       'rekha.singh@bihar.gov.in',      '$2b$12$KzT1HVtAWi3OUZ7Fk/CbVeP0n2mQ8rX1sHwDyL4jN6vB9cM5eIuKa', 'OFFICER', 'Kazi Mohammadpur PS','Muzaffarpur', TRUE, NOW() - INTERVAL '65 days'),
-- OFFICERs — Bhagalpur
('SI Santosh Gupta',     'santosh.gupta@bihar.gov.in',    '$2b$12$KzT1HVtAWi3OUZ7Fk/CbVeP0n2mQ8rX1sHwDyL4jN6vB9cM5eIuKa', 'OFFICER', 'Bhagalpur Town PS','Bhagalpur',   TRUE, NOW() - INTERVAL '60 days'),
('ASI Kavita Rani',      'kavita.rani@bihar.gov.in',      '$2b$12$KzT1HVtAWi3OUZ7Fk/CbVeP0n2mQ8rX1sHwDyL4jN6vB9cM5eIuKa', 'OFFICER', 'Nathnagar PS',    'Bhagalpur',      TRUE, NOW() - INTERVAL '55 days'),
-- OFFICERs — Other districts
('SI Amit Pandey',       'amit.pandey@bihar.gov.in',      '$2b$12$KzT1HVtAWi3OUZ7Fk/CbVeP0n2mQ8rX1sHwDyL4jN6vB9cM5eIuKa', 'OFFICER', 'Darbhanga Town PS','Darbhanga',   TRUE, NOW() - INTERVAL '50 days'),
('SI Neha Verma',        'neha.verma@bihar.gov.in',       '$2b$12$KzT1HVtAWi3OUZ7Fk/CbVeP0n2mQ8rX1sHwDyL4jN6vB9cM5eIuKa', 'OFFICER', 'Chapra Town PS',  'Saran',          TRUE, NOW() - INTERVAL '45 days'),
('ASI Dhruv Mishra',     'dhruv.mishra@bihar.gov.in',     '$2b$12$KzT1HVtAWi3OUZ7Fk/CbVeP0n2mQ8rX1sHwDyL4jN6vB9cM5eIuKa', 'OFFICER', 'Motihari Town PS','East Champaran', TRUE, NOW() - INTERVAL '40 days'),
('SI Geeta Prasad',      'geeta.prasad@bihar.gov.in',     '$2b$12$KzT1HVtAWi3OUZ7Fk/CbVeP0n2mQ8rX1sHwDyL4jN6vB9cM5eIuKa', 'OFFICER', 'Hajipur Town PS', 'Vaishali',       TRUE, NOW() - INTERVAL '35 days'),
('SI Dinesh Rai',        'dinesh.rai@bihar.gov.in',       '$2b$12$KzT1HVtAWi3OUZ7Fk/CbVeP0n2mQ8rX1sHwDyL4jN6vB9cM5eIuKa', 'OFFICER', 'Ara Town PS',     'Bhojpur',        TRUE, NOW() - INTERVAL '30 days'),
('ASI Mohan Lal',        'mohan.lal@bihar.gov.in',        '$2b$12$KzT1HVtAWi3OUZ7Fk/CbVeP0n2mQ8rX1sHwDyL4jN6vB9cM5eIuKa', 'OFFICER', 'Begusarai Town PS','Begusarai',    TRUE, NOW() - INTERVAL '25 days'),
('SI Puja Kumari',       'puja.kumari@bihar.gov.in',      '$2b$12$KzT1HVtAWi3OUZ7Fk/CbVeP0n2mQ8rX1sHwDyL4jN6vB9cM5eIuKa', 'OFFICER', 'Purnia Town PS',  'Purnia',         TRUE, NOW() - INTERVAL '20 days'),
('ASI Rajeev Ranjan',    'rajeev.ranjan@bihar.gov.in',    '$2b$12$KzT1HVtAWi3OUZ7Fk/CbVeP0n2mQ8rX1sHwDyL4jN6vB9cM5eIuKa', 'OFFICER', 'Siwan Town PS',   'Siwan',          TRUE, NOW() - INTERVAL '15 days'),
('SI Babita Singh',      'babita.singh@bihar.gov.in',     '$2b$12$KzT1HVtAWi3OUZ7Fk/CbVeP0n2mQ8rX1sHwDyL4jN6vB9cM5eIuKa', 'OFFICER', 'Bettiah Town PS', 'West Champaran', TRUE, NOW() - INTERVAL '10 days');


-- =============================================================================
-- STEP 2: ZONES — add all 20 major Bihar districts + 50 police stations
-- =============================================================================

TRUNCATE zones RESTART IDENTITY CASCADE;

-- Districts (type=DISTRICT)
INSERT INTO zones (name, type, district, area_km2, boundary) VALUES
('Patna',           'DISTRICT', 'Patna',           3202.5,  '{"type":"MultiPolygon","coordinates":[]}'),
('Gaya',            'DISTRICT', 'Gaya',            4976.0,  '{"type":"MultiPolygon","coordinates":[]}'),
('Muzaffarpur',     'DISTRICT', 'Muzaffarpur',     3172.5,  '{"type":"MultiPolygon","coordinates":[]}'),
('Bhagalpur',       'DISTRICT', 'Bhagalpur',       2569.0,  '{"type":"MultiPolygon","coordinates":[]}'),
('Darbhanga',       'DISTRICT', 'Darbhanga',       2278.5,  '{"type":"MultiPolygon","coordinates":[]}'),
('Munger',          'DISTRICT', 'Munger',          1419.9,  '{"type":"MultiPolygon","coordinates":[]}'),
('Begusarai',       'DISTRICT', 'Begusarai',       1918.5,  '{"type":"MultiPolygon","coordinates":[]}'),
('Purnia',          'DISTRICT', 'Purnia',          3229.0,  '{"type":"MultiPolygon","coordinates":[]}'),
('Samastipur',      'DISTRICT', 'Samastipur',      2904.5,  '{"type":"MultiPolygon","coordinates":[]}'),
('Nalanda',         'DISTRICT', 'Nalanda',         2355.4,  '{"type":"MultiPolygon","coordinates":[]}'),
('Rohtas',          'DISTRICT', 'Rohtas',          3850.7,  '{"type":"MultiPolygon","coordinates":[]}'),
('Saran',           'DISTRICT', 'Saran',           2641.1,  '{"type":"MultiPolygon","coordinates":[]}'),
('Siwan',           'DISTRICT', 'Siwan',           2219.0,  '{"type":"MultiPolygon","coordinates":[]}'),
('East Champaran',  'DISTRICT', 'East Champaran',  3968.4,  '{"type":"MultiPolygon","coordinates":[]}'),
('West Champaran',  'DISTRICT', 'West Champaran',  5228.5,  '{"type":"MultiPolygon","coordinates":[]}'),
('Vaishali',        'DISTRICT', 'Vaishali',        2036.3,  '{"type":"MultiPolygon","coordinates":[]}'),
('Bhojpur',         'DISTRICT', 'Bhojpur',         2395.0,  '{"type":"MultiPolygon","coordinates":[]}'),
('Aurangabad',      'DISTRICT', 'Aurangabad',      3389.3,  '{"type":"MultiPolygon","coordinates":[]}'),
('Nawada',          'DISTRICT', 'Nawada',          2492.3,  '{"type":"MultiPolygon","coordinates":[]}'),
('Sitamarhi',       'DISTRICT', 'Sitamarhi',       2199.0,  '{"type":"MultiPolygon","coordinates":[]}');

-- Police Stations (type=STATION, parent_id = district id)
INSERT INTO zones (name, type, district, parent_id, boundary) VALUES
-- Patna stations (district id = 1)
('Kotwali PS',            'STATION', 'Patna',          1, '{"type":"MultiPolygon","coordinates":[]}'),
('Kankarbagh PS',         'STATION', 'Patna',          1, '{"type":"MultiPolygon","coordinates":[]}'),
('Civil Lines PS',        'STATION', 'Patna',          1, '{"type":"MultiPolygon","coordinates":[]}'),
('Pirbahore PS',          'STATION', 'Patna',          1, '{"type":"MultiPolygon","coordinates":[]}'),
('Gardanibagh PS',        'STATION', 'Patna',          1, '{"type":"MultiPolygon","coordinates":[]}'),
('Danapur PS',            'STATION', 'Patna',          1, '{"type":"MultiPolygon","coordinates":[]}'),
('Phulwari PS',           'STATION', 'Patna',          1, '{"type":"MultiPolygon","coordinates":[]}'),
('Rajendra Nagar PS',     'STATION', 'Patna',          1, '{"type":"MultiPolygon","coordinates":[]}'),
-- Gaya stations (district id = 2)
('Gaya Town PS',          'STATION', 'Gaya',           2, '{"type":"MultiPolygon","coordinates":[]}'),
('Bodh Gaya PS',          'STATION', 'Gaya',           2, '{"type":"MultiPolygon","coordinates":[]}'),
('Sherghati PS',          'STATION', 'Gaya',           2, '{"type":"MultiPolygon","coordinates":[]}'),
('Tekari PS',             'STATION', 'Gaya',           2, '{"type":"MultiPolygon","coordinates":[]}'),
-- Muzaffarpur stations (district id = 3)
('Muzaffarpur Town PS',   'STATION', 'Muzaffarpur',    3, '{"type":"MultiPolygon","coordinates":[]}'),
('Kazi Mohammadpur PS',   'STATION', 'Muzaffarpur',    3, '{"type":"MultiPolygon","coordinates":[]}'),
('Mushahari PS',          'STATION', 'Muzaffarpur',    3, '{"type":"MultiPolygon","coordinates":[]}'),
('Sakra PS',              'STATION', 'Muzaffarpur',    3, '{"type":"MultiPolygon","coordinates":[]}'),
-- Bhagalpur stations (district id = 4)
('Bhagalpur Town PS',     'STATION', 'Bhagalpur',      4, '{"type":"MultiPolygon","coordinates":[]}'),
('Nathnagar PS',          'STATION', 'Bhagalpur',      4, '{"type":"MultiPolygon","coordinates":[]}'),
('Sultanganj PS',         'STATION', 'Bhagalpur',      4, '{"type":"MultiPolygon","coordinates":[]}'),
('Kahalgaon PS',          'STATION', 'Bhagalpur',      4, '{"type":"MultiPolygon","coordinates":[]}'),
-- Darbhanga stations (district id = 5)
('Darbhanga Town PS',     'STATION', 'Darbhanga',      5, '{"type":"MultiPolygon","coordinates":[]}'),
('Laheriasarai PS',       'STATION', 'Darbhanga',      5, '{"type":"MultiPolygon","coordinates":[]}'),
('Biraul PS',             'STATION', 'Darbhanga',      5, '{"type":"MultiPolygon","coordinates":[]}'),
-- Other district stations (one each for brevity — expand as needed)
('Munger Town PS',        'STATION', 'Munger',         6, '{"type":"MultiPolygon","coordinates":[]}'),
('Jamalpur PS',           'STATION', 'Munger',         6, '{"type":"MultiPolygon","coordinates":[]}'),
('Begusarai Town PS',     'STATION', 'Begusarai',      7, '{"type":"MultiPolygon","coordinates":[]}'),
('Teghra PS',             'STATION', 'Begusarai',      7, '{"type":"MultiPolygon","coordinates":[]}'),
('Purnia Town PS',        'STATION', 'Purnia',         8, '{"type":"MultiPolygon","coordinates":[]}'),
('Kasba PS',              'STATION', 'Purnia',         8, '{"type":"MultiPolygon","coordinates":[]}'),
('Samastipur Town PS',    'STATION', 'Samastipur',     9, '{"type":"MultiPolygon","coordinates":[]}'),
('Dalsinghsarai PS',      'STATION', 'Samastipur',     9, '{"type":"MultiPolygon","coordinates":[]}'),
('Bihar Sharif PS',       'STATION', 'Nalanda',       10, '{"type":"MultiPolygon","coordinates":[]}'),
('Rajgir PS',             'STATION', 'Nalanda',       10, '{"type":"MultiPolygon","coordinates":[]}'),
('Sasaram Town PS',       'STATION', 'Rohtas',        11, '{"type":"MultiPolygon","coordinates":[]}'),
('Dehri PS',              'STATION', 'Rohtas',        11, '{"type":"MultiPolygon","coordinates":[]}'),
('Chapra Town PS',        'STATION', 'Saran',         12, '{"type":"MultiPolygon","coordinates":[]}'),
('Revelganj PS',          'STATION', 'Saran',         12, '{"type":"MultiPolygon","coordinates":[]}'),
('Siwan Town PS',         'STATION', 'Siwan',         13, '{"type":"MultiPolygon","coordinates":[]}'),
('Maharajganj PS',        'STATION', 'Siwan',         13, '{"type":"MultiPolygon","coordinates":[]}'),
('Motihari Town PS',      'STATION', 'East Champaran',14, '{"type":"MultiPolygon","coordinates":[]}'),
('Adapur PS',             'STATION', 'East Champaran',14, '{"type":"MultiPolygon","coordinates":[]}'),
('Bettiah Town PS',       'STATION', 'West Champaran',15, '{"type":"MultiPolygon","coordinates":[]}'),
('Bagaha PS',             'STATION', 'West Champaran',15, '{"type":"MultiPolygon","coordinates":[]}'),
('Hajipur Town PS',       'STATION', 'Vaishali',      16, '{"type":"MultiPolygon","coordinates":[]}'),
('Lalganj PS',            'STATION', 'Vaishali',      16, '{"type":"MultiPolygon","coordinates":[]}'),
('Ara Town PS',           'STATION', 'Bhojpur',       17, '{"type":"MultiPolygon","coordinates":[]}'),
('Jagdishpur PS',         'STATION', 'Bhojpur',       17, '{"type":"MultiPolygon","coordinates":[]}'),
('Aurangabad Town PS',    'STATION', 'Aurangabad',    18, '{"type":"MultiPolygon","coordinates":[]}'),
('Nawada Town PS',        'STATION', 'Nawada',        19, '{"type":"MultiPolygon","coordinates":[]}'),
('Sitamarhi Town PS',     'STATION', 'Sitamarhi',     20, '{"type":"MultiPolygon","coordinates":[]}');


-- =============================================================================
-- STEP 3: CRIME CLASSIFICATIONS — 60 IPC / special act sections
-- =============================================================================

TRUNCATE crime_classifications RESTART IDENTITY CASCADE;

INSERT INTO crime_classifications (act_type, section_code, title, category, severity, is_women_safety, is_accident_related, is_cognizable, bailable) VALUES
-- Property Crimes
('IPC', '379',  'Theft',                        'Property',  2, FALSE, FALSE, TRUE,  TRUE),
('IPC', '380',  'Theft in Dwelling House',       'Property',  3, FALSE, FALSE, TRUE,  FALSE),
('IPC', '381',  'Theft by Servant',              'Property',  2, FALSE, FALSE, TRUE,  FALSE),
('IPC', '382',  'Theft with Preparation to Cause Death', 'Property', 4, FALSE, FALSE, TRUE, FALSE),
('IPC', '392',  'Robbery',                       'Property',  4, FALSE, FALSE, TRUE,  FALSE),
('IPC', '393',  'Attempt to Commit Robbery',     'Property',  3, FALSE, FALSE, TRUE,  FALSE),
('IPC', '394',  'Voluntarily Causing Hurt in Robbery', 'Property', 4, FALSE, FALSE, TRUE, FALSE),
('IPC', '395',  'Dacoity',                       'Property',  5, FALSE, FALSE, TRUE,  FALSE),
('IPC', '396',  'Dacoity with Murder',           'Property',  5, FALSE, FALSE, TRUE,  FALSE),
('IPC', '457',  'Lurking House-Trespass at Night','Property', 3, FALSE, FALSE, TRUE,  FALSE),
('IPC', '458',  'Lurking House-Trespass with Hurt','Property',4, FALSE, FALSE, TRUE,  FALSE),
('IPC', '420',  'Cheating and Dishonest Inducement','Economic',3, FALSE, FALSE, TRUE, FALSE),
('IPC', '406',  'Criminal Breach of Trust',      'Economic',  3, FALSE, FALSE, TRUE,  FALSE),
('IPC', '467',  'Forgery of Valuable Security',  'Economic',  4, FALSE, FALSE, TRUE,  FALSE),
('IPC', '468',  'Forgery for Cheating',          'Economic',  3, FALSE, FALSE, TRUE,  FALSE),
('IPC', '471',  'Using Forged Document',         'Economic',  3, FALSE, FALSE, TRUE,  FALSE),

-- Violent Crimes
('IPC', '302',  'Murder',                        'Violent',   5, FALSE, FALSE, TRUE,  FALSE),
('IPC', '304',  'Culpable Homicide Not Murder',  'Violent',   5, FALSE, FALSE, TRUE,  FALSE),
('IPC', '304A', 'Causing Death by Negligence',   'Violent',   3, FALSE, TRUE,  TRUE,  TRUE),
('IPC', '307',  'Attempt to Murder',             'Violent',   5, FALSE, FALSE, TRUE,  FALSE),
('IPC', '308',  'Attempt to Culpable Homicide',  'Violent',   4, FALSE, FALSE, TRUE,  FALSE),
('IPC', '323',  'Voluntarily Causing Hurt',      'Violent',   2, FALSE, FALSE, TRUE,  TRUE),
('IPC', '324',  'Voluntarily Causing Hurt by Dangerous Weapon','Violent',3,FALSE,FALSE,TRUE,FALSE),
('IPC', '325',  'Voluntarily Causing Grievous Hurt','Violent',3, FALSE, FALSE, TRUE,  FALSE),
('IPC', '326',  'Voluntarily Causing Grievous Hurt by Dangerous Weapon','Violent',4,FALSE,FALSE,TRUE,FALSE),
('IPC', '363',  'Kidnapping',                    'Violent',   4, FALSE, FALSE, TRUE,  FALSE),
('IPC', '364',  'Kidnapping for Ransom',         'Violent',   5, FALSE, FALSE, TRUE,  FALSE),
('IPC', '364A', 'Kidnapping for Ransom/Murder',  'Violent',   5, FALSE, FALSE, TRUE,  FALSE),
('IPC', '365',  'Kidnapping with Intent to Confine','Violent',4, FALSE, FALSE, TRUE,  FALSE),

-- Women Safety
('IPC', '354',  'Assault on Woman to Outrage Modesty','WomenSafety',4,TRUE,FALSE,TRUE,FALSE),
('IPC', '354A', 'Sexual Harassment',             'WomenSafety',3, TRUE, FALSE, TRUE,  FALSE),
('IPC', '354B', 'Assault on Woman to Disrobe',   'WomenSafety',4, TRUE, FALSE, TRUE,  FALSE),
('IPC', '354C', 'Voyeurism',                     'WomenSafety',3, TRUE, FALSE, TRUE,  FALSE),
('IPC', '354D', 'Stalking',                      'WomenSafety',3, TRUE, FALSE, TRUE,  FALSE),
('IPC', '376',  'Rape',                          'WomenSafety',5, TRUE, FALSE, TRUE,  FALSE),
('IPC', '376A', 'Rape Causing Death or Vegetative State','WomenSafety',5,TRUE,FALSE,TRUE,FALSE),
('IPC', '498A', 'Cruelty by Husband/Relatives',  'WomenSafety',4, TRUE, FALSE, TRUE,  FALSE),
('IPC', '509',  'Obscene Acts/Words to Insult Woman','WomenSafety',2,TRUE,FALSE,TRUE, TRUE),
('POCSO','4',   'Penetrative Sexual Assault on Child','WomenSafety',5,TRUE,FALSE,TRUE,FALSE),
('POCSO','8',   'Sexual Assault on Child',       'WomenSafety',5, TRUE, FALSE, TRUE,  FALSE),
('POCSO','12',  'Sexual Harassment of Child',    'WomenSafety',4, TRUE, FALSE, TRUE,  FALSE),

-- Narcotics
('NDPS', '8',   'Possession of Narcotic Drug',   'Narcotics', 3, FALSE, FALSE, TRUE,  FALSE),
('NDPS', '20',  'Production/Cultivation of Cannabis','Narcotics',4,FALSE,FALSE,TRUE,  FALSE),
('NDPS', '21',  'Possession of Manufactured Drugs','Narcotics',4,FALSE,FALSE,TRUE,   FALSE),
('NDPS', '22',  'Possession of Psychotropic Substance','Narcotics',3,FALSE,FALSE,TRUE,FALSE),
('NDPS', '29',  'Abetment and Criminal Conspiracy','Narcotics',4,FALSE,FALSE,TRUE,   FALSE),

-- Public Order
('IPC', '143',  'Unlawful Assembly',             'Public Order',2,FALSE,FALSE,TRUE,  TRUE),
('IPC', '147',  'Rioting',                       'Public Order',3,FALSE,FALSE,TRUE,  FALSE),
('IPC', '148',  'Rioting with Deadly Weapon',    'Public Order',4,FALSE,FALSE,TRUE,  FALSE),
('IPC', '188',  'Disobedience of Public Servant Order','Public Order',1,FALSE,FALSE,TRUE,TRUE),
('IPC', '332',  'Voluntarily Causing Hurt to Deter Public Servant','Violent',3,FALSE,FALSE,TRUE,FALSE),

-- Cyber Crimes
('IT_ACT', '66',  'Computer-Related Offences',   'Cyber',     3, FALSE, FALSE, TRUE,  TRUE),
('IT_ACT', '66C', 'Identity Theft',              'Cyber',     3, FALSE, FALSE, TRUE,  FALSE),
('IT_ACT', '66D', 'Cheating by Personation using Computer','Cyber',3,FALSE,FALSE,TRUE,FALSE),
('IT_ACT', '67',  'Publishing Obscene Material Online','Cyber',4,TRUE,FALSE,TRUE,   FALSE),
('IT_ACT', '67A', 'Publishing Sexually Explicit Material','Cyber',4,TRUE,FALSE,TRUE,FALSE),

-- Traffic
('IPC', '279',  'Rash Driving on Public Way',    'Traffic',   2, FALSE, TRUE,  TRUE,  TRUE),
('IPC', '338',  'Causing Grievous Hurt by Negligence','Traffic',3,FALSE,TRUE, TRUE,  TRUE),
('MVA', '185',  'Drunken Driving',               'Traffic',   2, FALSE, TRUE,  TRUE,  TRUE),
('MVA', '184',  'Dangerous Driving',             'Traffic',   2, FALSE, TRUE,  TRUE,  TRUE);


-- =============================================================================
-- STEP 4: FIRS — clear old data and insert 500+ realistic FIRs
-- Using Bihar district coordinates with small offsets for realistic clustering
-- =============================================================================

TRUNCATE firs RESTART IDENTITY CASCADE;

-- Helper: district centroid coordinates
-- Patna:      25.5941, 85.1376
-- Gaya:       24.7955, 84.9994
-- Muzaffarpur:26.1197, 85.3910
-- Bhagalpur:  25.2425, 87.0059
-- Darbhanga:  26.1542, 85.8918
-- Munger:     25.3737, 86.4738
-- Begusarai:  25.4182, 86.1272
-- Purnia:     25.7771, 87.4753
-- Samastipur: 25.8766, 85.7803
-- Saran:      25.7772, 84.7459

INSERT INTO firs (fir_no, crime_type, act_type, section_code, classification_id, category, severity,
                  occurred_at, location, location_name, police_station, zone, zone_id,
                  victim_gender, victim_age, victim_count, status, source, registered_by, description)
SELECT
  'FIR-2025-' || LPAD(n::text, 5, '0'),
  crime_type,
  act_type,
  section_code,
  class_id,
  category,
  severity,
  NOW() - (random() * INTERVAL '365 days'),
  jsonb_build_object('lat', lat + (random()-0.5)*0.08, 'lon', lon + (random()-0.5)*0.08),
  location_name,
  station,
  district,
  zone_id,
  CASE WHEN random() < 0.45 THEN 'MALE'
       WHEN random() < 0.80 THEN 'FEMALE'
       ELSE 'UNKNOWN' END,
  (18 + random() * 52)::int,
  (1 + random() * 3)::int,
  CASE WHEN n % 10 < 4 THEN 'PENDING'
       WHEN n % 10 < 7 THEN 'UNDER_INVESTIGATION'
       WHEN n % 10 < 9 THEN 'CHARGESHEETED'
       ELSE 'CLOSED' END,
  CASE WHEN n % 15 = 0 THEN 'BULK_IMPORT'
       WHEN n % 20 = 0 THEN 'CCTNS'
       ELSE 'MANUAL' END,
  (11 + (n % 20))::int,
  description
FROM (
  VALUES
    -- Patna cluster (200 FIRs, high crime density)
    (1,  'Theft',              'IPC',    '379',  1,  'Property', 2, 25.5941, 85.1376, 'Gandhi Maidan Area',      'Kotwali PS',          'Patna', 21, 'Motorcycle stolen from parking near Gandhi Maidan'),
    (2,  'Robbery',            'IPC',    '392',  5,  'Property', 4, 25.5941, 85.1376, 'Exhibition Road',         'Kotwali PS',          'Patna', 21, 'Armed robbery at shop on Exhibition Road'),
    (3,  'Rape',               'IPC',    '376',  36, 'WomenSafety',5,25.6092,85.1790,'Kankarbagh Colony',       'Kankarbagh PS',       'Patna', 22, 'Sexual assault reported by victim'),
    (4,  'Murder',             'IPC',    '302',  17, 'Violent',  5, 25.5941, 85.1376, 'Patna City Ghat',         'Kotwali PS',          'Patna', 21, 'Body found near river ghat'),
    (5,  'Narcotics Possession','NDPS',  '21',   44, 'Narcotics',4, 25.6138, 85.1348, 'Boring Road Junction',    'Civil Lines PS',      'Patna', 23, 'Heroin seized from accused at checkpoint'),
    (6,  'Theft in Dwelling House','IPC','380',  2,  'Property', 3, 25.6092, 85.1790, 'Rajendra Nagar',          'Rajendra Nagar PS',   'Patna', 28, 'Burglary in residential colony'),
    (7,  'Assault on Woman',   'IPC',    '354',  30, 'WomenSafety',4,25.5858,85.1400,'Fraser Road',             'Kotwali PS',          'Patna', 21, 'Molestation on public road'),
    (8,  'Cheating',           'IPC',    '420',  12, 'Economic', 3, 25.6138, 85.1348, 'Patna Junction Area',     'Kotwali PS',          'Patna', 21, 'Fraud in property deal worth 15 lakhs'),
    (9,  'Kidnapping',         'IPC',    '363',  26, 'Violent',  4, 25.6092, 85.1790, 'Kankarbagh PS area',      'Kankarbagh PS',       'Patna', 22, 'Minor kidnapped from school vicinity'),
    (10, 'Dacoity',            'IPC',    '395',  8,  'Property', 5, 25.5800, 85.1600, 'Patna Sahib Area',        'Pirbahore PS',        'Patna', 24, 'Armed dacoity at jewellery shop'),
    (11, 'Theft',              'IPC',    '379',  1,  'Property', 2, 25.5941, 85.1376, 'Dak Bungalow Chowk',      'Kotwali PS',          'Patna', 21, 'Mobile phone snatched by bike-borne miscreants'),
    (12, 'Stalking',           'IPC',    '354D', 35, 'WomenSafety',3,25.6138,85.1790,'Bailey Road',             'Civil Lines PS',      'Patna', 23, 'Victim stalked by ex-colleague'),
    (13, 'Robbery',            'IPC',    '392',  5,  'Property', 4, 25.6200, 85.1500, 'Boring Canal Road',       'Civil Lines PS',      'Patna', 23, 'Cash robbed from bank employee'),
    (14, 'Murder',             'IPC',    '302',  17, 'Violent',  5, 25.5700, 85.1200, 'Old Bypass Area',         'Gardanibagh PS',      'Patna', 25, 'Dispute over land led to murder'),
    (15, 'Narcotics Possession','NDPS',  '20',   43, 'Narcotics',4, 25.5600, 85.0900, 'Danapur Cantonment Area', 'Danapur PS',          'Patna', 26, 'Ganja seized from vehicle at naka'),
    (16, 'Theft',              'IPC',    '379',  1,  'Property', 2, 25.5941, 85.1376, 'Ashiana More',            'Kankarbagh PS',       'Patna', 22, 'Two-wheeler stolen from market'),
    (17, 'Attempt to Murder',  'IPC',    '307',  21, 'Violent',  5, 25.6092, 85.1790, 'Anisabad Area',           'Kankarbagh PS',       'Patna', 22, 'Gun attack in property dispute'),
    (18, 'Identity Theft',     'IT_ACT', '66C',  54, 'Cyber',    3, 25.6138, 85.1348, 'Online',                  'Civil Lines PS',      'Patna', 23, 'Bank account hacked via OTP fraud'),
    (19, 'Cruelty by Husband', 'IPC',    '498A', 38, 'WomenSafety',4,25.5850,85.1550,'Phulwari Sharif',         'Phulwari PS',         'Patna', 27, 'Domestic violence case reported by wife'),
    (20, 'Dacoity with Murder','IPC',    '396',  9,  'Property', 5, 25.5941, 85.1376, 'Patna City',              'Kotwali PS',          'Patna', 21, 'Shopkeeper killed in dacoity attempt'),
    -- Gaya cluster (80 FIRs)
    (21, 'Theft',              'IPC',    '379',  1,  'Property', 2, 24.7955, 84.9994, 'Gaya Junction Area',      'Gaya Town PS',        'Gaya',  29, 'Luggage theft at railway station'),
    (22, 'Murder',             'IPC',    '302',  17, 'Violent',  5, 24.8100, 85.0200, 'Bodh Gaya Road',          'Bodh Gaya PS',        'Gaya',  30, 'Communal violence led to murder'),
    (23, 'Robbery',            'IPC',    '392',  5,  'Property', 4, 24.7900, 84.9800, 'Gaya Market',             'Gaya Town PS',        'Gaya',  29, 'Cash snatching from auto passenger'),
    (24, 'Rape',               'IPC',    '376',  36, 'WomenSafety',5,24.7955,84.9994,'Rural Gaya',              'Sherghati PS',        'Gaya',  31, 'Minor assault case under POCSO'),
    (25, 'Narcotics Possession','NDPS',  '21',   44, 'Narcotics',4, 24.8000, 85.0100, 'NH-82 Checkpoint',        'Gaya Town PS',        'Gaya',  29, 'Brown sugar seized from bus passenger'),
    (26, 'Kidnapping',         'IPC',    '363',  26, 'Violent',  4, 24.7800, 84.9700, 'Tekari Road',             'Tekari PS',           'Gaya',  32, 'Child abduction case'),
    (27, 'Cheating',           'IPC',    '420',  12, 'Economic', 3, 24.7955, 84.9994, 'Gaya Civil Lines',        'Gaya Town PS',        'Gaya',  29, 'Investment fraud — multiple victims'),
    (28, 'Theft',              'IPC',    '379',  1,  'Property', 2, 24.8050, 84.9850, 'Bodh Gaya Temple Area',   'Bodh Gaya PS',        'Gaya',  30, 'Tourist robbed near temple complex'),
    (29, 'Rioting',            'IPC',    '147',  50, 'Public Order',3,24.7900,84.9900,'Gaya Sadar',             'Gaya Town PS',        'Gaya',  29, 'Communal tension — stone pelting'),
    (30, 'Assault on Woman',   'IPC',    '354',  30, 'WomenSafety',4,24.7955,84.9994,'Bodh Gaya Tourist Zone',  'Bodh Gaya PS',        'Gaya',  30, 'Eve teasing complaint by foreign tourist'),
    -- Muzaffarpur cluster (80 FIRs)
    (31, 'Theft',              'IPC',    '379',  1,  'Property', 2, 26.1197, 85.3910, 'Mithanpura Area',         'Muzaffarpur Town PS', 'Muzaffarpur', 33, 'Chain snatching near hospital'),
    (32, 'Murder',             'IPC',    '302',  17, 'Violent',  5, 26.1300, 85.4000, 'Sakra Road',              'Sakra PS',            'Muzaffarpur', 36, 'Land dispute murder'),
    (33, 'Rape',               'IPC',    '376',  36, 'WomenSafety',5,26.1100,85.3800,'Mushahari Area',          'Mushahari PS',        'Muzaffarpur', 35, 'Gang rape reported by victim'),
    (34, 'Robbery',            'IPC',    '392',  5,  'Property', 4, 26.1197, 85.3910, 'Jubba Sahni Park Area',   'Muzaffarpur Town PS', 'Muzaffarpur', 33, 'Armed robbery at ATM'),
    (35, 'Kidnapping for Ransom','IPC',  '364A', 28, 'Violent',  5, 26.1400, 85.4100, 'NH-28 Muzaffarpur',       'Kazi Mohammadpur PS', 'Muzaffarpur', 34, 'Businessman kidnapped, ransom demanded'),
    (36, 'Narcotics Possession','NDPS',  '21',   44, 'Narcotics',4, 26.1197, 85.3910, 'Bus Stand Muzaffarpur',   'Muzaffarpur Town PS', 'Muzaffarpur', 33, 'Heroin seized from interstate carrier'),
    (37, 'Assault on Woman',   'IPC',    '354A', 31, 'WomenSafety',3,26.1200,85.3950,'Muzaffarpur College Road','Kazi Mohammadpur PS', 'Muzaffarpur', 34, 'Sexual harassment on campus'),
    (38, 'Theft',              'IPC',    '380',  2,  'Property', 3, 26.1100, 85.3800, 'Saraiyaganj Market',      'Muzaffarpur Town PS', 'Muzaffarpur', 33, 'Burglary at electronics store'),
    (39, 'Cheating',           'IPC',    '420',  12, 'Economic', 3, 26.1197, 85.3910, 'Muzaffarpur Bank Colony', 'Muzaffarpur Town PS', 'Muzaffarpur', 33, 'Online fraud through fake job offer'),
    (40, 'Dacoity',            'IPC',    '395',  8,  'Property', 5, 26.1300, 85.4200, 'Kanti Highway',           'Sakra PS',            'Muzaffarpur', 36, 'Highway dacoity on NH-28'),
    -- Bhagalpur cluster (60 FIRs)
    (41, 'Theft',              'IPC',    '379',  1,  'Property', 2, 25.2425, 87.0059, 'Bhagalpur Market',        'Bhagalpur Town PS',   'Bhagalpur', 37, 'Gold chain snatching'),
    (42, 'Murder',             'IPC',    '302',  17, 'Violent',  5, 25.2500, 87.0150, 'Nathnagar Industrial Area','Nathnagar PS',        'Bhagalpur', 38, 'Worker killed in factory dispute'),
    (43, 'Robbery',            'IPC',    '392',  5,  'Property', 4, 25.2425, 87.0059, 'Silk City Market',        'Bhagalpur Town PS',   'Bhagalpur', 37, 'Robbery at silk trader shop'),
    (44, 'Rape',               'IPC',    '376',  36, 'WomenSafety',5,25.2300,87.0000,'Sabour Agricultural Area','Sultanganj PS',       'Bhagalpur', 39, 'Minor sexual assault case'),
    (45, 'Narcotics',          'NDPS',   '21',   44, 'Narcotics',4, 25.2500, 87.0200, 'Bhagalpur Railway Station','Bhagalpur Town PS',  'Bhagalpur', 37, 'Drugs seized from train passenger'),
    (46, 'Kidnapping',         'IPC',    '363',  26, 'Violent',  4, 25.2400, 87.0100, 'Vikramshila Road',        'Kahalgaon PS',        'Bhagalpur', 40, 'Child abduction from school'),
    (47, 'Assault on Woman',   'IPC',    '354',  30, 'WomenSafety',4,25.2425,87.0059,'TM Bhagalpur University',  'Bhagalpur Town PS',   'Bhagalpur', 37, 'Molestation on university campus'),
    (48, 'Cheating',           'IPC',    '420',  12, 'Economic', 3, 25.2425, 87.0059, 'Bhagalpur Civil Lines',   'Bhagalpur Town PS',   'Bhagalpur', 37, 'Land fraud — forged documents'),
    (49, 'Dacoity',            'IPC',    '395',  8,  'Property', 5, 25.2600, 87.0300, 'Kahalgaon Ghat',          'Kahalgaon PS',        'Bhagalpur', 40, 'Armed dacoity at petrol pump'),
    (50, 'Cruelty by Husband', 'IPC',    '498A', 38, 'WomenSafety',4,25.2425,87.0059,'Bhagalpur Civil Area',    'Bhagalpur Town PS',   'Bhagalpur', 37, 'Dowry harassment complaint'),
    -- Darbhanga cluster
    (51, 'Theft',              'IPC',    '379',  1,  'Property', 2, 26.1542, 85.8918, 'Darbhanga Market',        'Darbhanga Town PS',   'Darbhanga', 41, 'Mobile snatching in busy market'),
    (52, 'Murder',             'IPC',    '302',  17, 'Violent',  5, 26.1600, 85.9000, 'Laheriasarai Area',       'Laheriasarai PS',     'Darbhanga', 42, 'Inter-gang rivalry murder'),
    (53, 'Robbery',            'IPC',    '392',  5,  'Property', 4, 26.1542, 85.8918, 'Darbhanga Station Road',  'Darbhanga Town PS',   'Darbhanga', 41, 'Cash van robbery attempt'),
    (54, 'Rape',               'IPC',    '376',  36, 'WomenSafety',5,26.1400,85.8700,'Rural Biraul Area',       'Biraul PS',           'Darbhanga', 43, 'Gang rape — arrested on same day'),
    (55, 'Narcotics',          'NDPS',   '21',   44, 'Narcotics',4, 26.1542, 85.8918, 'NH-57 Darbhanga',         'Darbhanga Town PS',   'Darbhanga', 41, 'Drug peddler arrested with 500g heroin'),
    -- Additional diverse FIRs across all districts
    (56, 'Theft',              'IPC',    '379',  1,  'Property', 2, 25.3737, 86.4738, 'Munger Market',           'Munger Town PS',      'Munger',    44, 'Bicycle theft reported'),
    (57, 'Robbery',            'IPC',    '392',  5,  'Property', 4, 25.4182, 86.1272, 'Begusarai Chowk',         'Begusarai Town PS',   'Begusarai', 46, 'Petrol pump robbery'),
    (58, 'Murder',             'IPC',    '302',  17, 'Violent',  5, 25.7771, 87.4753, 'Purnia City',             'Purnia Town PS',      'Purnia',    48, 'Domestic dispute turned fatal'),
    (59, 'Assault on Woman',   'IPC',    '354',  30, 'WomenSafety',4,25.8766,85.7803,'Samastipur Market',       'Samastipur Town PS',  'Samastipur',50, 'Street harassment complaint'),
    (60, 'Narcotics',          'NDPS',   '22',   45, 'Narcotics',3, 25.0027, 85.5146, 'Bihar Sharif Bus Stand',  'Bihar Sharif PS',     'Nalanda',   52, 'Tablet drugs seized'),
    (61, 'Theft',              'IPC',    '379',  1,  'Property', 2, 24.9895, 84.0318, 'Sasaram Market',          'Sasaram Town PS',     'Rohtas',    54, 'Shop break-in at night'),
    (62, 'Dacoity',            'IPC',    '395',  8,  'Property', 5, 25.7772, 84.7459, 'NH-19 Chapra',            'Chapra Town PS',      'Saran',     56, 'Highway dacoity — 4 vehicles looted'),
    (63, 'Murder',             'IPC',    '302',  17, 'Violent',  5, 26.2209, 84.3578, 'Siwan City',              'Siwan Town PS',       'Siwan',     58, 'Political rivalry murder'),
    (64, 'Kidnapping',         'IPC',    '364A', 28, 'Violent',  5, 26.6531, 84.9181, 'Motihari City',           'Motihari Town PS',    'East Champaran', 60, 'Businessman kidnapped near highway'),
    (65, 'Rape',               'IPC',    '376',  36, 'WomenSafety',5,27.0280,84.3601,'Bettiah Rural Area',      'Bettiah Town PS',     'West Champaran', 62, 'Reported after 3 days delay'),
    (66, 'Theft',              'IPC',    '379',  1,  'Property', 2, 25.7277, 85.2148, 'Hajipur Bazaar',          'Hajipur Town PS',     'Vaishali',  64, 'Gold ornament theft from house'),
    (67, 'Murder',             'IPC',    '302',  17, 'Violent',  5, 25.5566, 84.6600, 'Ara City',                'Ara Town PS',         'Bhojpur',   66, 'Armed conflict — 2 killed'),
    (68, 'Assault on Woman',   'IPC',    '354',  30, 'WomenSafety',4,24.7560,84.3739,'Aurangabad Town',         'Aurangabad Town PS',  'Aurangabad',68, 'Harassment at workplace'),
    (69, 'Narcotics',          'NDPS',   '21',   44, 'Narcotics',4, 24.8867, 85.5369, 'Nawada NH Road',          'Nawada Town PS',      'Nawada',    69, 'Drug trafficking from Jharkhand border'),
    (70, 'Robbery',            'IPC',    '392',  5,  'Property', 4, 26.5915, 85.4796, 'Sitamarhi Market',        'Sitamarhi Town PS',   'Sitamarhi', 70, 'Cash stolen from bank customer'),
    -- More Patna FIRs for clustering density
    (71, 'Theft',              'IPC',    '379',  1,  'Property', 2, 25.5941, 85.1376, 'Patna Secretariat Area',  'Kotwali PS',          'Patna', 21, 'Two-wheeler theft from govt office'),
    (72, 'Cheating',           'IT_ACT', '66D',  55, 'Cyber',    3, 25.6138, 85.1348, 'Online Patna',            'Civil Lines PS',      'Patna', 23, 'UPI fraud — Rs 80,000 lost'),
    (73, 'Robbery',            'IPC',    '392',  5,  'Property', 4, 25.5800, 85.1600, 'Patna Medical College',   'Pirbahore PS',        'Patna', 24, 'Cash snatching from doctor'),
    (74, 'Murder',             'IPC',    '302',  17, 'Violent',  5, 25.6092, 85.1790, 'Kankarbagh Main Road',    'Kankarbagh PS',       'Patna', 22, 'Body found in drain'),
    (75, 'Narcotics',          'NDPS',   '21',   44, 'Narcotics',4, 25.5941, 85.1376, 'Rajendra Nagar',          'Rajendra Nagar PS',   'Patna', 28, 'Ganja seized from youth gang'),
    (76, 'Assault on Woman',   'IPC',    '354A', 31, 'WomenSafety',3,25.6200,85.1500,'Patna City Bus',           'Civil Lines PS',      'Patna', 23, 'Harassment in public transport'),
    (77, 'Kidnapping',         'IPC',    '363',  26, 'Violent',  4, 25.5941, 85.1376, 'Boring Road',             'Civil Lines PS',      'Patna', 23, 'School child missing for 2 days'),
    (78, 'Dacoity',            'IPC',    '395',  8,  'Property', 5, 25.5800, 85.1200, 'Gardanibagh Night Market','Gardanibagh PS',      'Patna', 25, 'Shopkeepers looted at gunpoint'),
    (79, 'Theft',              'IPC',    '380',  2,  'Property', 3, 25.5600, 85.0900, 'Danapur Market',          'Danapur PS',          'Patna', 26, 'Jewellery stolen from house'),
    (80, 'Cruelty by Husband', 'IPC',    '498A', 38, 'WomenSafety',4,25.5941,85.1376,'Rajbansi Nagar Patna',    'Kankarbagh PS',       'Patna', 22, 'Dowry demand with physical abuse')
) AS t(n, crime_type, act_type, section_code, class_id, category, severity, lat, lon,
        location_name, station, district, zone_id, description);


-- Generate additional 400 FIRs using series (realistic distribution)
-- Uses LIMIT 1 OFFSET (n%20) to pick a template row — avoids ROW()::record field access
WITH fir_templates (crime_type, act_type, section_code, class_id, category, severity,
                    base_lat, base_lon, loc_name, station, district, zone_id) AS (
  VALUES
    ('Theft',               'IPC',    '379',  1,  'Property',   2, 25.5941::float, 85.1376::float, 'Patna Central',       'Kotwali PS',          'Patna',       21::int),
    ('Robbery',             'IPC',    '392',  5,  'Property',   4, 25.5941::float, 85.1376::float, 'Patna Chowk',         'Kotwali PS',          'Patna',       21::int),
    ('Murder',              'IPC',    '302',  17, 'Violent',    5, 25.5941::float, 85.1376::float, 'Patna Ghat',          'Kotwali PS',          'Patna',       21::int),
    ('Rape',                'IPC',    '376',  36, 'WomenSafety',5, 25.6092::float, 85.1790::float, 'Kankarbagh',          'Kankarbagh PS',       'Patna',       22::int),
    ('Narcotics Possession','NDPS',   '21',   44, 'Narcotics',  4, 25.5941::float, 85.1376::float, 'NH-30 Patna',         'Kotwali PS',          'Patna',       21::int),
    ('Assault on Woman',    'IPC',    '354',  30, 'WomenSafety',4, 25.6138::float, 85.1348::float, 'Civil Lines Patna',   'Civil Lines PS',      'Patna',       23::int),
    ('Cheating',            'IPC',    '420',  12, 'Economic',   3, 25.6092::float, 85.1790::float, 'Kankarbagh Colony',   'Kankarbagh PS',       'Patna',       22::int),
    ('Kidnapping',          'IPC',    '363',  26, 'Violent',    4, 25.6138::float, 85.1348::float, 'Bailey Road',         'Civil Lines PS',      'Patna',       23::int),
    ('Dacoity',             'IPC',    '395',  8,  'Property',   5, 25.5800::float, 85.1600::float, 'Pirbahore Area',      'Pirbahore PS',        'Patna',       24::int),
    ('Cruelty by Husband',  'IPC',    '498A', 38, 'WomenSafety',4, 25.5850::float, 85.1550::float, 'Gardanibagh',         'Gardanibagh PS',      'Patna',       25::int),
    ('Theft',               'IPC',    '379',  1,  'Property',   2, 24.7955::float, 84.9994::float, 'Gaya Bazaar',         'Gaya Town PS',        'Gaya',        29::int),
    ('Murder',              'IPC',    '302',  17, 'Violent',    5, 24.7955::float, 84.9994::float, 'Gaya City',           'Gaya Town PS',        'Gaya',        29::int),
    ('Robbery',             'IPC',    '392',  5,  'Property',   4, 24.7955::float, 84.9994::float, 'Bodh Gaya Road',      'Gaya Town PS',        'Gaya',        29::int),
    ('Rape',                'IPC',    '376',  36, 'WomenSafety',5, 24.8100::float, 85.0200::float, 'Bodh Gaya',           'Bodh Gaya PS',        'Gaya',        30::int),
    ('Narcotics',           'NDPS',   '21',   44, 'Narcotics',  4, 24.7955::float, 84.9994::float, 'Gaya Station',        'Gaya Town PS',        'Gaya',        29::int),
    ('Theft',               'IPC',    '379',  1,  'Property',   2, 26.1197::float, 85.3910::float, 'Muzaffarpur Bazaar',  'Muzaffarpur Town PS', 'Muzaffarpur', 33::int),
    ('Murder',              'IPC',    '302',  17, 'Violent',    5, 26.1197::float, 85.3910::float, 'Mithanpura',          'Muzaffarpur Town PS', 'Muzaffarpur', 33::int),
    ('Robbery',             'IPC',    '392',  5,  'Property',   4, 26.1100::float, 85.3800::float, 'Mushahari Road',      'Mushahari PS',        'Muzaffarpur', 35::int),
    ('Assault on Woman',    'IPC',    '354',  30, 'WomenSafety',4, 26.1300::float, 85.4000::float, 'Sakra Area',          'Sakra PS',            'Muzaffarpur', 36::int),
    ('Kidnapping for Ransom','IPC',   '364A', 28, 'Violent',    5, 26.1197::float, 85.3910::float, 'NH-28',               'Muzaffarpur Town PS', 'Muzaffarpur', 33::int)
)
INSERT INTO firs (fir_no, crime_type, act_type, section_code, classification_id, category, severity,
                  occurred_at, location, location_name, police_station, zone, zone_id,
                  victim_gender, victim_age, victim_count, status, source, registered_by)
SELECT
  'FIR-2025-' || LPAD((80 + gs.n)::text, 5, '0'),
  t.crime_type, t.act_type, t.section_code, t.class_id, t.category, t.severity,
  NOW() - (random() * INTERVAL '365 days'),
  jsonb_build_object('lat', t.base_lat + (random()-0.5)*0.10, 'lon', t.base_lon + (random()-0.5)*0.10),
  t.loc_name, t.station, t.district, t.zone_id,
  CASE WHEN random() < 0.50 THEN 'MALE' WHEN random() < 0.80 THEN 'FEMALE' ELSE 'UNKNOWN' END,
  (18 + random() * 50)::int,
  (1 + random() * 2)::int,
  CASE WHEN random() < 0.35 THEN 'PENDING'
       WHEN random() < 0.65 THEN 'UNDER_INVESTIGATION'
       WHEN random() < 0.85 THEN 'CHARGESHEETED'
       ELSE 'CLOSED' END,
  CASE WHEN random() < 0.10 THEN 'BULK_IMPORT' ELSE 'MANUAL' END,
  (11 + (gs.n % 20))
FROM generate_series(1, 400) AS gs(n)
CROSS JOIN LATERAL (
  SELECT * FROM fir_templates LIMIT 1 OFFSET (gs.n % 20)
) t
ON CONFLICT (fir_no) DO NOTHING;


-- =============================================================================
-- STEP 5: PATROL UNITS
-- =============================================================================

INSERT INTO patrol_units (unit_code, unit_type, officer_name, officer_badge, status, station,
                          last_lat, last_lon, last_seen) VALUES
('PCR-PAT-001', 'VEHICLE',    'Constable Ram Nath',      'BPB-1021', 'AVAILABLE',  'Kotwali PS',          25.5960, 85.1390, NOW() - INTERVAL '2 hours'),
('PCR-PAT-002', 'VEHICLE',    'Constable Shyam Bihari',  'BPB-1034', 'ON_PATROL',  'Kankarbagh PS',       25.6100, 85.1800, NOW() - INTERVAL '30 minutes'),
('PCR-PAT-003', 'MOTORCYCLE', 'Constable Anil Kumar',    'BPB-1078', 'ON_PATROL',  'Civil Lines PS',      25.6150, 85.1360, NOW() - INTERVAL '15 minutes'),
('PCR-PAT-004', 'VEHICLE',    'Constable Sunil Paswan',  'BPB-1092', 'AVAILABLE',  'Pirbahore PS',        25.5810, 85.1620, NOW() - INTERVAL '1 hour'),
('PCR-PAT-005', 'MOTORCYCLE', 'Constable Vinod Singh',   'BPB-1105', 'ON_PATROL',  'Gardanibagh PS',      25.5820, 85.1250, NOW() - INTERVAL '45 minutes'),
('PCR-PAT-006', 'VEHICLE',    'Constable Rakesh Yadav',  'BPB-1143', 'AVAILABLE',  'Danapur PS',          25.5620, 85.0950, NOW() - INTERVAL '3 hours'),
('PCR-GAY-001', 'VEHICLE',    'Constable Deepu Kumar',   'BPB-2011', 'AVAILABLE',  'Gaya Town PS',        24.7970, 84.9990, NOW() - INTERVAL '2 hours'),
('PCR-GAY-002', 'MOTORCYCLE', 'Constable Subhash Giri',  'BPB-2024', 'ON_PATROL',  'Bodh Gaya PS',        24.8110, 85.0190, NOW() - INTERVAL '1 hour'),
('PCR-MUZ-001', 'VEHICLE',    'Constable Pramod Jha',    'BPB-3001', 'AVAILABLE',  'Muzaffarpur Town PS', 26.1210, 85.3920, NOW() - INTERVAL '2 hours'),
('PCR-MUZ-002', 'MOTORCYCLE', 'Constable Sanjay Sah',    'BPB-3018', 'ON_PATROL',  'Kazi Mohammadpur PS', 26.1350, 85.4050, NOW() - INTERVAL '20 minutes'),
('PCR-BHA-001', 'VEHICLE',    'Constable Dinesh Ram',    'BPB-4002', 'AVAILABLE',  'Bhagalpur Town PS',   25.2440, 87.0070, NOW() - INTERVAL '4 hours'),
('PCR-BHA-002', 'MOTORCYCLE', 'Constable Pappu Sharma',  'BPB-4019', 'ON_PATROL',  'Nathnagar PS',        25.2510, 87.0160, NOW() - INTERVAL '50 minutes'),
('PCR-DAR-001', 'VEHICLE',    'Constable Ganesh Mishra', 'BPB-5005', 'AVAILABLE',  'Darbhanga Town PS',   26.1550, 85.8930, NOW() - INTERVAL '1 hour'),
('PCR-SAR-001', 'VEHICLE',    'Constable Rajiv Mehta',   'BPB-6008', 'ON_PATROL',  'Chapra Town PS',      25.7780, 84.7470, NOW() - INTERVAL '35 minutes'),
('PCR-BEG-001', 'MOTORCYCLE', 'Constable Vivek Rajan',   'BPB-7003', 'AVAILABLE',  'Begusarai Town PS',   25.4190, 86.1280, NOW() - INTERVAL '2 hours');


-- =============================================================================
-- STEP 6: PATROL ROUTES + STOPS (update existing + add new)
-- =============================================================================

UPDATE patrol_routes SET
  zone = 'Patna',
  total_distance_km = 18.4,
  estimated_duration_min = 110,
  assigned_unit = 1
WHERE id = 1;

UPDATE patrol_routes SET
  zone = 'Patna',
  total_distance_km = 22.1,
  estimated_duration_min = 130,
  assigned_unit = 2
WHERE id = 2;

UPDATE patrol_routes SET
  zone = 'Gaya',
  total_distance_km = 15.8,
  estimated_duration_min = 95,
  assigned_unit = 7
WHERE id = 3;

UPDATE patrol_routes SET
  zone = 'Muzaffarpur',
  total_distance_km = 19.3,
  estimated_duration_min = 120,
  assigned_unit = 9
WHERE id = 4;

INSERT INTO patrol_routes (name, zone, created_by, assigned_unit, status, risk_score,
                           total_distance_km, estimated_duration_min, scheduled_for, notes) VALUES
('Bhagalpur Night Patrol 2025-04-15',  'Bhagalpur',   2, 11, 'COMPLETED', 72.4, 16.2, 100, NOW() - INTERVAL '20 days', 'High-risk silk market coverage'),
('Muzaffarpur Day Patrol 2025-04-20',  'Muzaffarpur', 3, 10, 'COMPLETED', 68.9, 14.5,  90, NOW() - INTERVAL '15 days', 'Post-kidnapping heightened patrol'),
('Patna Central Special 2025-05-01',   'Patna',       1,  3, 'PLANNED',   85.1, 24.3, 150, NOW() + INTERVAL '2 days',  'Pre-election security patrol'),
('Darbhanga Evening Patrol 2025-05-05','Darbhanga',   5, 13, 'PLANNED',   61.3, 13.7,  85, NOW() + INTERVAL '5 days',  'Routine evening patrol'),
('Saran Highway Patrol 2025-05-07',    'Saran',       5, 14, 'ACTIVE',    78.6, 31.2, 190, NOW(),                       'NH-19 anti-dacoity operation');


-- Patrol stops for new routes
-- After TRUNCATE users CASCADE, patrol_routes sequence restarts from 1.
-- The 5 inserted routes get IDs 1-5 in insertion order:
--   1=Bhagalpur, 2=Muzaffarpur, 3=Patna Central, 4=Darbhanga, 5=Saran
INSERT INTO patrol_route_stops (route_id, sequence, latitude, longitude, zone_name, stop_name, crime_count, risk_score, dwell_time_min) VALUES
-- Route 1 (Bhagalpur Night Patrol)
(1,1, 25.2425, 87.0059, 'Bhagalpur Town PS', 'Bhagalpur Railway Station', 12, 72.1, 10),
(1,2, 25.2510, 87.0160, 'Nathnagar PS',       'Nathnagar Industrial Zone', 8,  65.4,  8),
(1,3, 25.2380, 87.0100, 'Bhagalpur Town PS', 'Silk City Market',          15, 78.3, 12),
(1,4, 25.2300, 87.0000, 'Sultanganj PS',      'Vikramshila Setu Entry',   6,  55.2,  7),
(1,5, 25.2600, 87.0300, 'Kahalgaon PS',       'Kahalgaon Power Plant Gate',5, 49.8,  5),
-- Route 2 (Muzaffarpur Day Patrol)
(2,1, 26.1197, 85.3910, 'Muzaffarpur Town PS','Muzaffarpur Station',      14, 73.8, 10),
(2,2, 26.1300, 85.4000, 'Kazi Mohammadpur PS','Jubba Sahni Park',          9,  62.4,  8),
(2,3, 26.1100, 85.3800, 'Mushahari PS',        'Mushahari Market',         7,  58.1,  7),
(2,4, 26.1400, 85.4200, 'Sakra PS',            'NH-28 Sakra Chowk',       11, 69.5, 10),
-- Route 3 (Patna Central Special)
(3,1, 25.5941, 85.1376, 'Kotwali PS',          'Gandhi Maidan',           18, 85.2, 15),
(3,2, 25.6138, 85.1348, 'Civil Lines PS',       'Boring Road Crossing',   14, 78.6, 12),
(3,3, 25.6092, 85.1790, 'Kankarbagh PS',        'Anisabad Chowk',         16, 82.3, 12),
(3,4, 25.5800, 85.1600, 'Pirbahore PS',         'Patna Sahib Ghat',       10, 68.4,  8),
(3,5, 25.5850, 85.1550, 'Gardanibagh PS',       'Gardanibagh Market',     12, 72.1, 10),
(3,6, 25.5941, 85.1376, 'Kotwali PS',           'Exhibition Road',        20, 88.5, 15);


-- =============================================================================
-- STEP 7: PATROL LOGS
-- =============================================================================

INSERT INTO patrol_logs (route_id, unit_id, officer_id, started_at, completed_at,
                          coverage_pct, stops_visited, stops_planned,
                          distance_km_actual, incidents_encountered, notes) VALUES
(1, 1, 11, NOW()-INTERVAL '30 days 20 hours', NOW()-INTERVAL '30 days 17 hours', 100.0, 5, 5, 17.8, 0, 'Peaceful patrol, no incidents'),
(2, 2, 12, NOW()-INTERVAL '28 days 21 hours', NOW()-INTERVAL '28 days 18 hours',  80.0, 4, 5, 18.2, 1, 'One minor altercation dispersed'),
(3, 7, 17, NOW()-INTERVAL '25 days 20 hours', NOW()-INTERVAL '25 days 17 hours', 100.0, 4, 4, 15.3, 0, 'Routine patrol completed'),
(4, 9, 19, NOW()-INTERVAL '20 days 21 hours', NOW()-INTERVAL '20 days 18 hours',  75.0, 3, 4, 14.1, 1, 'Vehicle breakdown — one stop missed'),
(5, 11,21, NOW()-INTERVAL '20 days 22 hours', NOW()-INTERVAL '20 days 18 hours', 100.0, 5, 5, 15.9, 0, 'Silk market patrol — no incidents'),
(2, 10,19, NOW()-INTERVAL '15 days 20 hours', NOW()-INTERVAL '15 days 17 hours', 100.0, 4, 4, 14.2, 1, 'Suspect detained for questioning'),
(1, 3, 13, NOW()-INTERVAL '10 days 21 hours', NOW()-INTERVAL '10 days 18 hours',  60.0, 3, 5, 12.4, 0, 'Shortened due to rain'),
(2, 4, 14, NOW()-INTERVAL '7 days  20 hours', NOW()-INTERVAL '7 days  17 hours', 100.0, 5, 5, 22.0, 2, 'Two arrests made during patrol');


-- =============================================================================
-- STEP 8: IRAD ACCIDENTS — add 75 more
-- =============================================================================

INSERT INTO irad_accidents (accident_id, occurred_at, severity, location, location_name,
                             road_name, road_type, district, police_station,
                             vehicles_involved, casualties, injuries, weather_condition, light_condition, source)
SELECT
  'IRAD-2025-' || LPAD((25 + n)::text, 5, '0'),
  NOW() - (random() * INTERVAL '365 days'),
  CASE WHEN random() < 0.15 THEN 3 WHEN random() < 0.45 THEN 2 ELSE 1 END,
  jsonb_build_object('lat', lat + (random()-0.5)*0.08, 'lon', lon + (random()-0.5)*0.08),
  loc_name,
  road_name,
  road_type,
  district,
  station,
  (1 + random() * 3)::int,
  CASE WHEN random() < 0.12 THEN (1 + random()*2)::int ELSE 0 END,
  (random() * 4)::int,
  (ARRAY['CLEAR','RAIN','FOG','CLEAR','CLEAR'])[1 + (random()*4)::int],
  (ARRAY['DAYLIGHT','DUSK','DARK_LIT','DARK_UNLIT','DAYLIGHT','DAYLIGHT'])[1 + (random()*5)::int],
  'IRAD'
FROM (
  VALUES
    (1,  25.5941, 85.1376, 'Patna Bypass Near Danapur',    'NH-19',  'NH', 'Patna',       'Danapur PS'),
    (2,  25.6138, 85.1348, 'Boring Road Crossing',         'SH-1',   'SH', 'Patna',       'Civil Lines PS'),
    (3,  25.5800, 85.1600, 'Ashok Rajpath',                'NH-30',  'NH', 'Patna',       'Kotwali PS'),
    (4,  24.7955, 84.9994, 'Gaya-Bodh Gaya Road',          'NH-83',  'NH', 'Gaya',        'Bodh Gaya PS'),
    (5,  24.8100, 85.0200, 'Sherghati Bypass',             'SH-5',   'SH', 'Gaya',        'Sherghati PS'),
    (6,  26.1197, 85.3910, 'Muzaffarpur-Darbhanga Highway','NH-57',  'NH', 'Muzaffarpur', 'Muzaffarpur Town PS'),
    (7,  26.1300, 85.4100, 'Kanti Road',                   'SH-74',  'SH', 'Muzaffarpur', 'Sakra PS'),
    (8,  25.2425, 87.0059, 'Bhagalpur Bypass',             'NH-80',  'NH', 'Bhagalpur',   'Bhagalpur Town PS'),
    (9,  26.1542, 85.8918, 'Darbhanga-Samastipur Road',    'NH-57',  'NH', 'Darbhanga',   'Darbhanga Town PS'),
    (10, 25.7772, 84.7459, 'Chapra-Patna NH',              'NH-19',  'NH', 'Saran',       'Chapra Town PS')
) AS t(n, lat, lon, loc_name, road_name, road_type, district, station)
CROSS JOIN generate_series(0, 6) AS g(x)
ON CONFLICT (accident_id) DO NOTHING;


-- =============================================================================
-- STEP 9: GEO-FENCES
-- =============================================================================

INSERT INTO geo_fences (name, type, boundary, bbox, alert_radius_m, notify_roles, description, active, created_by) VALUES
('Patna High Court Premises',  'GOVERNMENT',
 '{"type":"Polygon","coordinates":[[[85.136,25.605604],[85.137034,25.605481],[85.137998,25.605121],[85.138826,25.604548],[85.139461,25.603802],[85.13986,25.602933],[85.139996,25.602],[85.13986,25.601067],[85.139461,25.600198],[85.138826,25.599452],[85.137998,25.598879],[85.137034,25.598519],[85.136,25.598396],[85.134966,25.598519],[85.134002,25.598879],[85.133174,25.599452],[85.132539,25.600198],[85.13214,25.601067],[85.132004,25.602],[85.13214,25.602933],[85.132539,25.603802],[85.133174,25.604548],[85.134002,25.605121],[85.134966,25.605481],[85.136,25.605604]]]}',
 '{"minLat":25.5984,"maxLat":25.6056,"minLon":85.1320,"maxLon":85.1400}',
 400, ARRAY['ADMIN','OFFICER'], 'Bihar High Court — alert on any crime within 400m', TRUE, 1),

('Patna Gandhi Maidan',        'GOVERNMENT',
 '{"type":"Polygon","coordinates":[[[85.1375,25.614203],[85.138276,25.614111],[85.138999,25.613841],[85.139619,25.613411],[85.140096,25.612851],[85.140395,25.6122],[85.140497,25.6115],[85.140395,25.6108],[85.140096,25.610149],[85.139619,25.609589],[85.138999,25.609159],[85.138276,25.608889],[85.1375,25.608797],[85.136724,25.608889],[85.136001,25.609159],[85.135381,25.609589],[85.134904,25.610149],[85.134605,25.6108],[85.134503,25.6115],[85.134605,25.6122],[85.134904,25.612851],[85.135381,25.613411],[85.136001,25.613841],[85.136724,25.614111],[85.1375,25.614203]]]}',
 '{"minLat":25.6088,"maxLat":25.6142,"minLon":85.1345,"maxLon":85.1405}',
 300, ARRAY['ADMIN','OFFICER'], 'Gandhi Maidan public assembly ground', TRUE, 1),

('Nalanda Mahavihara (UNESCO)', 'RELIGIOUS',
 '{"type":"Polygon","coordinates":[[[85.4485,25.143005],[85.449788,25.142851],[85.450988,25.142401],[85.452018,25.141685],[85.452809,25.140752],[85.453306,25.139666],[85.453476,25.1385],[85.453306,25.137334],[85.452809,25.136248],[85.452018,25.135315],[85.450988,25.134599],[85.449788,25.134149],[85.4485,25.133995],[85.447212,25.134149],[85.446012,25.134599],[85.444982,25.135315],[85.444191,25.136248],[85.443694,25.137334],[85.443524,25.1385],[85.443694,25.139666],[85.444191,25.140752],[85.444982,25.141685],[85.446012,25.142401],[85.447212,25.142851],[85.4485,25.143005]]]}',
 '{"minLat":25.134,"maxLat":25.143,"minLon":85.4435,"maxLon":85.4535}',
 500, ARRAY['ADMIN','OFFICER'], 'UNESCO World Heritage Site — tourist safety priority', TRUE, 1),

('Bodh Gaya Mahabodhi Temple',  'RELIGIOUS',
 '{"type":"Polygon","coordinates":[[[84.993,24.703905],[84.99454,24.703721],[84.995975,24.703181],[84.997207,24.702322],[84.998153,24.701203],[84.998747,24.699899],[84.99895,24.6985],[84.998747,24.697101],[84.998153,24.695797],[84.997207,24.694678],[84.995975,24.693819],[84.99454,24.693279],[84.993,24.693095],[84.99146,24.693279],[84.990025,24.693819],[84.988793,24.694678],[84.987847,24.695797],[84.987253,24.697101],[84.98705,24.6985],[84.987253,24.699899],[84.987847,24.701203],[84.988793,24.702322],[84.990025,24.703181],[84.99146,24.703721],[84.993,24.703905]]]}',
 '{"minLat":24.6931,"maxLat":24.7039,"minLon":84.9871,"maxLon":84.9990}',
 600, ARRAY['ADMIN','OFFICER','ANALYST'], 'UNESCO Heritage — peak tourist season alert zone', TRUE, 2),

('PMCH Patna',                  'HOSPITAL',
 '{"type":"Polygon","coordinates":[[[85.146,25.616252],[85.146646,25.616176],[85.147249,25.615951],[85.147766,25.615593],[85.148163,25.615126],[85.148413,25.614583],[85.148498,25.614],[85.148413,25.613417],[85.148163,25.612874],[85.147766,25.612407],[85.147249,25.612049],[85.146646,25.611824],[85.146,25.611748],[85.145354,25.611824],[85.144751,25.612049],[85.144234,25.612407],[85.143837,25.612874],[85.143587,25.613417],[85.143502,25.614],[85.143587,25.614583],[85.143837,25.615126],[85.144234,25.615593],[85.144751,25.615951],[85.145354,25.616176],[85.146,25.616252]]]}',
 '{"minLat":25.6117,"maxLat":25.6163,"minLon":85.1435,"maxLon":85.1485}',
 250, ARRAY['ADMIN','OFFICER'], 'Patna Medical College Hospital — no crime zone', TRUE, 1),

('IGIMS Patna',                 'HOSPITAL',
 '{"type":"Polygon","coordinates":[[[85.1655,25.609252],[85.166146,25.609176],[85.166749,25.608951],[85.167266,25.608593],[85.167663,25.608126],[85.167912,25.607583],[85.167998,25.607],[85.167912,25.606417],[85.167663,25.605874],[85.167266,25.605407],[85.166749,25.605049],[85.166146,25.604824],[85.1655,25.604748],[85.164854,25.604824],[85.164251,25.605049],[85.163734,25.605407],[85.163337,25.605874],[85.163088,25.606417],[85.163002,25.607],[85.163088,25.607583],[85.163337,25.608126],[85.163734,25.608593],[85.164251,25.608951],[85.164854,25.609176],[85.1655,25.609252]]]}',
 '{"minLat":25.6047,"maxLat":25.6093,"minLon":85.1630,"maxLon":85.1680}',
 250, ARRAY['ADMIN','OFFICER'], 'Indira Gandhi Institute of Medical Sciences', TRUE, 1),

('Patna University Campus',     'SCHOOL',
 '{"type":"Polygon","coordinates":[[[85.1245,25.627203],[85.125276,25.627111],[85.125999,25.626841],[85.12662,25.626411],[85.127096,25.625851],[85.127395,25.6252],[85.127498,25.6245],[85.127395,25.6238],[85.127096,25.623149],[85.12662,25.622589],[85.125999,25.622159],[85.125276,25.621889],[85.1245,25.621797],[85.123724,25.621889],[85.123001,25.622159],[85.12238,25.622589],[85.121904,25.623149],[85.121605,25.6238],[85.121502,25.6245],[85.121605,25.6252],[85.121904,25.625851],[85.12238,25.626411],[85.123001,25.626841],[85.123724,25.627111],[85.1245,25.627203]]]}',
 '{"minLat":25.6218,"maxLat":25.6272,"minLon":85.1215,"maxLon":85.1275}',
 300, ARRAY['ADMIN','OFFICER'], 'Women safety priority zone — university area', TRUE, 1),

('Bihar Raj Bhavan',            'GOVERNMENT',
 '{"type":"Polygon","coordinates":[[[85.1405,25.606505],[85.141793,25.606351],[85.142997,25.605901],[85.144032,25.605185],[85.144826,25.604252],[85.145325,25.603166],[85.145495,25.602],[85.145325,25.600834],[85.144826,25.599748],[85.144032,25.598815],[85.142997,25.598099],[85.141793,25.597649],[85.1405,25.597495],[85.139207,25.597649],[85.138003,25.598099],[85.136968,25.598815],[85.136174,25.599748],[85.135675,25.600834],[85.135505,25.602],[85.135675,25.603166],[85.136174,25.604252],[85.136968,25.605185],[85.138003,25.605901],[85.139207,25.606351],[85.1405,25.606505]]]}',
 '{"minLat":25.5975,"maxLat":25.6065,"minLon":85.1355,"maxLon":85.1455}',
 500, ARRAY['ADMIN'], 'Governor''s Residence — high security zone', TRUE, 1),

('India-Nepal Border Raxaul',   'BORDER',
 '{"type":"Polygon","coordinates":[[[84.83,27.199009],[84.832621,27.198702],[84.835064,27.197802],[84.837162,27.19637],[84.838771,27.194505],[84.839783,27.192332],[84.840128,27.19],[84.839783,27.187668],[84.838771,27.185495],[84.837162,27.18363],[84.835064,27.182198],[84.832621,27.181298],[84.83,27.180991],[84.827379,27.181298],[84.824936,27.182198],[84.822838,27.18363],[84.821229,27.185495],[84.820217,27.187668],[84.819872,27.19],[84.820217,27.192332],[84.821229,27.194505],[84.822838,27.19637],[84.824936,27.197802],[84.827379,27.198702],[84.83,27.199009]]]}',
 '{"minLat":27.181,"maxLat":27.199,"minLon":84.820,"maxLon":84.840}',
 1000, ARRAY['ADMIN','OFFICER'], 'International border — smuggling alert zone', TRUE, 1),

('Gaya Airport',                'GOVERNMENT',
 '{"type":"Polygon","coordinates":[[[84.956,24.752505],[84.957284,24.752351],[84.95848,24.751901],[84.959507,24.751185],[84.960296,24.750252],[84.960791,24.749166],[84.96096,24.748],[84.960791,24.746834],[84.960296,24.745748],[84.959507,24.744815],[84.95848,24.744099],[84.957284,24.743649],[84.956,24.743495],[84.954716,24.743649],[84.95352,24.744099],[84.952493,24.744815],[84.951704,24.745748],[84.951209,24.746834],[84.95104,24.748],[84.951209,24.749166],[84.951704,24.750252],[84.952493,24.751185],[84.95352,24.751901],[84.954716,24.752351],[84.956,24.752505]]]}',
 '{"minLat":24.7435,"maxLat":24.7525,"minLon":84.9510,"maxLon":84.9610}',
 500, ARRAY['ADMIN','OFFICER'], 'Airport security perimeter', TRUE, 2),

('BIT Patna',                   'SCHOOL',
 '{"type":"Polygon","coordinates":[[[85.153,25.602703],[85.153776,25.602611],[85.154498,25.602341],[85.155119,25.601911],[85.155595,25.601351],[85.155895,25.6007],[85.155997,25.6],[85.155895,25.5993],[85.155595,25.598649],[85.155119,25.598089],[85.154498,25.597659],[85.153776,25.597389],[85.153,25.597297],[85.152224,25.597389],[85.151502,25.597659],[85.150881,25.598089],[85.150405,25.598649],[85.150105,25.5993],[85.150003,25.6],[85.150105,25.6007],[85.150405,25.601351],[85.150881,25.601911],[85.151502,25.602341],[85.152224,25.602611],[85.153,25.602703]]]}',
 '{"minLat":25.5973,"maxLat":25.6027,"minLon":85.1500,"maxLon":85.1560}',
 300, ARRAY['ADMIN','OFFICER'], 'Engineering college campus — women safety zone', TRUE, 1),

('Muzaffarpur Bus Stand',       'CUSTOM',
 '{"type":"Polygon","coordinates":[[[85.391,26.122703],[85.391779,26.122611],[85.392505,26.122341],[85.393128,26.121911],[85.393607,26.121351],[85.393908,26.1207],[85.39401,26.12],[85.393908,26.1193],[85.393607,26.118649],[85.393128,26.118089],[85.392505,26.117659],[85.391779,26.117389],[85.391,26.117297],[85.390221,26.117389],[85.389495,26.117659],[85.388872,26.118089],[85.388393,26.118649],[85.388092,26.1193],[85.38799,26.12],[85.388092,26.1207],[85.388393,26.121351],[85.388872,26.121911],[85.389495,26.122341],[85.390221,26.122611],[85.391,26.122703]]]}',
 '{"minLat":26.1173,"maxLat":26.1227,"minLon":85.3880,"maxLon":85.3940}',
 300, ARRAY['ADMIN','OFFICER'], 'High footfall — chain snatching incidents', TRUE, 3);


-- =============================================================================
-- STEP 10: ALERTS — 30 crime spike alerts
-- =============================================================================

INSERT INTO alerts (zone, crime_type, count, z_score, severity, message, anomaly_details, read_by, source) VALUES
('Patna',       'Theft',           134, 4.2, 'CRITICAL', 'Critical crime spike in Patna — 134 theft cases detected (z-score: 4.2x above baseline)',    '{"expected":18.3,"actual":134,"stdDev":27.7,"windowDays":7}', ARRAY[1,6], 'ANOMALY_DETECTION'),
('Muzaffarpur', 'Kidnapping',       28, 3.8, 'CRITICAL', 'Unusual kidnapping spike in Muzaffarpur — 28 cases vs expected 4 (z-score: 3.8)',             '{"expected":4.1,"actual":28,"stdDev":6.3,"windowDays":7}',  ARRAY[]::int[], 'ANOMALY_DETECTION'),
('Gaya',        'Robbery',          47, 3.2, 'HIGH',     'Robbery surge in Gaya — 47 incidents in 7 days, 3.2x baseline',                               '{"expected":14.7,"actual":47,"stdDev":10.1,"windowDays":7}', ARRAY[2,8], 'ANOMALY_DETECTION'),
('Bhagalpur',   'Narcotics',        38, 2.9, 'HIGH',     'Narcotics seizures spike in Bhagalpur — possible new supply route identified',                 '{"expected":10.2,"actual":38,"stdDev":9.6,"windowDays":7}',  ARRAY[4], 'ANOMALY_DETECTION'),
('Patna',       'WomenSafety',      52, 2.7, 'HIGH',     'Women safety incidents elevated in Patna — 52 cases (normal: ~19)',                            '{"expected":19.1,"actual":52,"stdDev":12.2,"windowDays":7}', ARRAY[1,6,7], 'ANOMALY_DETECTION'),
('Darbhanga',   'Murder',           12, 3.5, 'CRITICAL', 'Murder spike in Darbhanga — 12 cases in 7 days (z-score 3.5), gang activity suspected',        '{"expected":2.4,"actual":12,"stdDev":2.7,"windowDays":7}',  ARRAY[]::int[], 'ANOMALY_DETECTION'),
('Saran',       'Dacoity',           9, 3.1, 'HIGH',     'Highway dacoity spike on NH-19 Saran segment — 9 incidents in a week',                        '{"expected":1.8,"actual":9,"stdDev":2.3,"windowDays":7}',   ARRAY[]::int[], 'ANOMALY_DETECTION'),
('Muzaffarpur', 'Theft',            89, 2.4, 'MEDIUM',   'Theft elevated in Muzaffarpur — 89 cases (baseline 37)',                                       '{"expected":37.2,"actual":89,"stdDev":21.6,"windowDays":14}',ARRAY[3,7], 'ANOMALY_DETECTION'),
('Purnia',      'Narcotics',        31, 2.8, 'HIGH',     'Drug trafficking surge in Purnia near Bangladesh border corridor',                              '{"expected":8.4,"actual":31,"stdDev":8.1,"windowDays":7}',  ARRAY[]::int[], 'ANOMALY_DETECTION'),
('Begusarai',   'Robbery',          24, 2.2, 'MEDIUM',   'Robbery cases above threshold in Begusarai',                                                   '{"expected":9.1,"actual":24,"stdDev":6.8,"windowDays":7}',  ARRAY[1], 'ANOMALY_DETECTION'),
('Patna',       'Cyber',            41, 2.6, 'HIGH',     'Online fraud surge in Patna — 41 cyber complaints this week',                                  '{"expected":12.3,"actual":41,"stdDev":11.1,"windowDays":7}', ARRAY[1,6], 'ANOMALY_DETECTION'),
('Gaya',        'WomenSafety',      19, 2.1, 'MEDIUM',   'Women safety incidents up in Bodh Gaya tourist zone — tourist season factor',                  '{"expected":7.4,"actual":19,"stdDev":5.5,"windowDays":7}',  ARRAY[2,8], 'ANOMALY_DETECTION'),
('Bhagalpur',   'Theft',            76, 2.3, 'MEDIUM',   'Theft spike in Bhagalpur silk market area — festive season',                                   '{"expected":28.6,"actual":76,"stdDev":20.6,"windowDays":7}', ARRAY[4], 'ANOMALY_DETECTION'),
('West Champaran','Narcotics',      42, 3.3, 'CRITICAL', 'Major narcotics seizures near Nepal border — West Champaran. Cross-border smuggling suspected', '{"expected":7.2,"actual":42,"stdDev":10.5,"windowDays":7}', ARRAY[]::int[], 'ANOMALY_DETECTION'),
('Siwan',       'Murder',            7, 2.8, 'HIGH',     'Murder cases above baseline in Siwan — political tension noted',                                '{"expected":1.6,"actual":7,"stdDev":1.9,"windowDays":7}',   ARRAY[]::int[], 'ANOMALY_DETECTION'),
('Samastipur',  'Robbery',          18, 2.0, 'MEDIUM',   'Robbery uptick in Samastipur market area',                                                     '{"expected":7.2,"actual":18,"stdDev":5.4,"windowDays":7}',  ARRAY[]::int[], 'ANOMALY_DETECTION'),
('Nalanda',     'Theft',            34, 1.8, 'MEDIUM',   'Theft around tourist site Nalanda above seasonal average',                                     '{"expected":14.8,"actual":34,"stdDev":10.7,"windowDays":7}', ARRAY[]::int[], 'ANOMALY_DETECTION'),
('Patna',       'Kidnapping',       14, 3.0, 'CRITICAL', 'Kidnapping for ransom cluster near Patna — 4 cases in 3 days near Kankarbagh',                 '{"expected":2.1,"actual":14,"stdDev":3.9,"windowDays":3}',  ARRAY[]::int[], 'GEO_FENCE'),
('Muzaffarpur', 'Murder',           11, 3.6, 'CRITICAL', 'Murder spike Muzaffarpur — gang violence reported by local intelligence',                      '{"expected":1.9,"actual":11,"stdDev":2.5,"windowDays":7}',  ARRAY[]::int[], 'ANOMALY_DETECTION'),
('East Champaran','Narcotics',      29, 2.7, 'HIGH',     'Drug smuggling detected near Motihari — cross-border route active',                            '{"expected":6.8,"actual":29,"stdDev":8.2,"windowDays":7}',  ARRAY[]::int[], 'ANOMALY_DETECTION'),
('Rohtas',      'Dacoity',           6, 2.5, 'HIGH',     'Dacoity cases on Sasaram-Varanasi highway — armed gang suspected',                             '{"expected":1.2,"actual":6,"stdDev":1.9,"windowDays":7}',   ARRAY[]::int[], 'ANOMALY_DETECTION'),
('Vaishali',    'WomenSafety',      16, 2.2, 'MEDIUM',   'Women safety cases above baseline in Hajipur area',                                            '{"expected":5.8,"actual":16,"stdDev":4.6,"windowDays":7}',  ARRAY[]::int[], 'ANOMALY_DETECTION'),
('Bhojpur',     'Murder',            5, 2.3, 'MEDIUM',   'Murder cases in Ara above seasonal baseline',                                                   '{"expected":1.4,"actual":5,"stdDev":1.5,"windowDays":7}',   ARRAY[]::int[], 'ANOMALY_DETECTION'),
('Munger',      'Robbery',          15, 2.1, 'MEDIUM',   'Robbery cases up in Munger — Ganga Ghat area high risk',                                        '{"expected":5.7,"actual":15,"stdDev":4.4,"windowDays":7}',  ARRAY[]::int[], 'ANOMALY_DETECTION'),
('Patna',       'Dacoity',          11, 2.8, 'HIGH',     'Dacoity spike in Patna outskirts — armed gang reported active near Phulwari',                   '{"expected":2.2,"actual":11,"stdDev":3.1,"windowDays":7}',  ARRAY[]::int[], 'ANOMALY_DETECTION'),
('Gaya',        'Narcotics',        22, 2.3, 'MEDIUM',   'Narcotics elevated in Gaya — pilgrim route misuse suspected',                                   '{"expected":7.8,"actual":22,"stdDev":6.2,"windowDays":7}',  ARRAY[2], 'ANOMALY_DETECTION'),
('Darbhanga',   'Theft',            58, 2.1, 'MEDIUM',   'Theft above baseline in Darbhanga — festive season',                                           '{"expected":22.4,"actual":58,"stdDev":16.8,"windowDays":7}', ARRAY[]::int[], 'ANOMALY_DETECTION'),
('Sitamarhi',   'WomenSafety',      13, 2.4, 'MEDIUM',   'Women safety cases up in Sitamarhi near Nepal border',                                         '{"expected":4.1,"actual":13,"stdDev":3.7,"windowDays":7}',  ARRAY[]::int[], 'ANOMALY_DETECTION'),
('Bhagalpur',   'Murder',            8, 2.9, 'HIGH',     'Murder cases elevated in Bhagalpur — river mafia suspected',                                    '{"expected":1.8,"actual":8,"stdDev":2.1,"windowDays":7}',   ARRAY[]::int[], 'ANOMALY_DETECTION'),
('Purnia',      'Kidnapping',        9, 3.2, 'CRITICAL', 'Kidnapping spike in Purnia near border — trafficking route suspected',                          '{"expected":1.4,"actual":9,"stdDev":2.4,"windowDays":7}',   ARRAY[]::int[], 'ANOMALY_DETECTION');


-- =============================================================================
-- STEP 11: USER PREFERENCES
-- =============================================================================

INSERT INTO user_preferences (user_id, default_zone, theme, language, notification_enabled, email_alerts_enabled, map_default_layer)
SELECT id,
  CASE role
    WHEN 'ADMIN'   THEN NULL
    WHEN 'ANALYST' THEN zone
    ELSE zone
  END,
  'dark',
  'en',
  TRUE,
  CASE WHEN role = 'ADMIN' THEN TRUE ELSE FALSE END,
  CASE WHEN role = 'ANALYST' THEN 'heatmap' ELSE 'clusters' END
FROM users;


-- =============================================================================
-- STEP 12: AUDIT LOGS — add realistic entries
-- =============================================================================

TRUNCATE audit_logs RESTART IDENTITY;

INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata, ip_address, user_agent, created_at) VALUES
-- Login events
(1,  'LOGIN',           'users',         '1',   '{"role":"ADMIN"}',                          '192.168.1.10', 'Mozilla/5.0 Chrome/120', NOW() - INTERVAL '30 days'),
(11, 'LOGIN',           'users',         '11',  '{"role":"OFFICER","station":"Kotwali PS"}',  '10.0.0.21',    'Mozilla/5.0 Chrome/118', NOW() - INTERVAL '29 days'),
(12, 'LOGIN',           'users',         '12',  '{"role":"OFFICER","station":"Kankarbagh PS"}','10.0.0.22',   'Mozilla/5.0 Firefox/121',NOW() - INTERVAL '28 days'),
(6,  'LOGIN',           'users',         '6',   '{"role":"ANALYST"}',                         '10.0.0.30',    'Mozilla/5.0 Chrome/120', NOW() - INTERVAL '27 days'),
-- FIR events
(11, 'FIR_CREATE',      'firs',          '1',   '{"fir_no":"FIR-2025-00001","crime_type":"Theft","zone":"Patna"}', '10.0.0.21', 'Mozilla/5.0', NOW() - INTERVAL '29 days'),
(11, 'FIR_CREATE',      'firs',          '2',   '{"fir_no":"FIR-2025-00002","crime_type":"Narcotics","zone":"Patna"}','10.0.0.21','Mozilla/5.0',NOW()-INTERVAL '29 days'),
(12, 'FIR_CREATE',      'firs',          '3',   '{"fir_no":"FIR-2025-00003","crime_type":"WomenSafety","zone":"Muzaffarpur"}','10.0.0.22','Mozilla/5.0',NOW()-INTERVAL '28 days'),
(11, 'FIR_UPDATE',      'firs',          '4',   '{"field":"status","from":"PENDING","to":"UNDER_INVESTIGATION"}', '10.0.0.21', 'Mozilla/5.0', NOW() - INTERVAL '25 days'),
(1,  'FIR_BULK_IMPORT', 'firs',          NULL,  '{"count":120,"source":"CSV","zone":"Patna"}', '192.168.1.10', 'Mozilla/5.0', NOW() - INTERVAL '20 days'),
-- Route events
(1,  'ROUTE_GENERATE',  'patrol_routes', '1',   '{"zone":"Patna","stops":5,"vehicles":1,"algorithm":"OR-Tools VRP"}', '192.168.1.10', 'Mozilla/5.0', NOW() - INTERVAL '32 days'),
(2,  'ROUTE_GENERATE',  'patrol_routes', '2',   '{"zone":"Patna","stops":5,"vehicles":2}',    '192.168.1.11', 'Mozilla/5.0', NOW() - INTERVAL '30 days'),
(3,  'ROUTE_GENERATE',  'patrol_routes', '3',   '{"zone":"Gaya","stops":4,"vehicles":1}',     '192.168.1.12', 'Mozilla/5.0', NOW() - INTERVAL '27 days'),
-- Hotspot cluster events
(6,  'HOTSPOT_CLUSTER', 'hotspots',      NULL,  '{"zone":"Patna","algo":"DBSCAN","eps":300,"clusters_found":14}', '10.0.0.30', 'Mozilla/5.0', NOW() - INTERVAL '15 days'),
(7,  'HOTSPOT_CLUSTER', 'hotspots',      NULL,  '{"zone":"Muzaffarpur","algo":"DBSCAN","eps":300,"clusters_found":8}','10.0.0.31','Mozilla/5.0',NOW()-INTERVAL '14 days'),
(8,  'HOTSPOT_CLUSTER', 'hotspots',      NULL,  '{"zone":"Gaya","algo":"KDE","bandwidth":500,"grid_points":900}',  '10.0.0.32','Mozilla/5.0',NOW()-INTERVAL '13 days'),
-- ML train events
(1,  'ML_TRAIN',        'ml_model',      NULL,  '{"model":"RandomForest","samples":9960,"accuracy":0.873}', '192.168.1.10', 'Mozilla/5.0', NOW() - INTERVAL '10 days'),
-- User events
(1,  'USER_CREATE',     'users',         '11',  '{"email":"rajesh.kumar@bihar.gov.in","role":"OFFICER"}', '192.168.1.10', 'Mozilla/5.0', NOW() - INTERVAL '151 days'),
(1,  'USER_CREATE',     'users',         '12',  '{"email":"manoj.singh@bihar.gov.in","role":"OFFICER"}',  '192.168.1.10', 'Mozilla/5.0', NOW() - INTERVAL '141 days'),
(1,  'USER_UPDATE',     'users',         '4',   '{"field":"role","from":"OFFICER","to":"ANALYST"}',       '192.168.1.10', 'Mozilla/5.0', NOW() - INTERVAL '80 days'),
-- Geo-fence events
(1,  'GEO_FENCE_CREATE','geo_fences',    '1',   '{"name":"Patna High Court Premises","type":"GOVERNMENT"}','192.168.1.10','Mozilla/5.0', NOW() - INTERVAL '60 days'),
(1,  'GEO_FENCE_CREATE','geo_fences',    '5',   '{"name":"PMCH Patna","type":"HOSPITAL"}',                '192.168.1.10','Mozilla/5.0', NOW() - INTERVAL '58 days'),
-- Export events
(6,  'EXPORT_CSV',      'firs',          NULL,  '{"zone":"Patna","from":"2025-01-01","to":"2025-04-30","count":342}', '10.0.0.30', 'Mozilla/5.0', NOW() - INTERVAL '5 days'),
(8,  'EXPORT_CSV',      'firs',          NULL,  '{"zone":"Gaya","from":"2025-01-01","to":"2025-03-31","count":180}',  '10.0.0.32', 'Mozilla/5.0', NOW() - INTERVAL '3 days'),
-- Logouts
(11, 'LOGOUT',          'users',         '11',  '{}', '10.0.0.21', 'Mozilla/5.0', NOW() - INTERVAL '2 days'),
(6,  'LOGOUT',          'users',         '6',   '{}', '10.0.0.30', 'Mozilla/5.0', NOW() - INTERVAL '1 day');


-- =============================================================================
-- STEP 13: Verify views work
-- =============================================================================

SELECT 'fir_summary rows' AS check_name, COUNT(*) AS cnt FROM fir_summary;
SELECT 'zone_crime_stats rows' AS check_name, COUNT(*) AS cnt FROM zone_crime_stats;
SELECT 'hotspot_candidates rows' AS check_name, COUNT(*) AS cnt FROM hotspot_candidates;
SELECT 'dashboard_summary' AS check_name, firs_last_30d, pending_firs, top_crime_type FROM dashboard_summary;

COMMIT;
