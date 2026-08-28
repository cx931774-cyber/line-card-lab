UPDATE `users`
SET `email` = 'cx931774', `updated_at` = unixepoch()
WHERE `email` = 'cx931774@gmail.com'
  AND `role` = 'admin'
  AND NOT EXISTS (SELECT 1 FROM `users` WHERE `email` = 'cx931774');
