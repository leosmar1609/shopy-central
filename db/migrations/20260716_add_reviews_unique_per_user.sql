ALTER TABLE reviews ADD UNIQUE KEY uniq_reviews_product_user (product_id, user_id);
