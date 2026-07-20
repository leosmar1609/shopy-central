CREATE TABLE site_settings (
  id TINYINT PRIMARY KEY DEFAULT 1,
  hero_image_url TEXT NULL
);
INSERT INTO site_settings (id, hero_image_url) VALUES (1, NULL);
