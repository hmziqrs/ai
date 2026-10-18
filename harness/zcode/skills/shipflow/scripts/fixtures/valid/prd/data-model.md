# Data model

Entities and their keys. Names and values are invented for this fixture.

- **Organisation**: `id`, `name`, `slug`. One organisation has many models.
- **Model**: `id`, `organisation_id`, `slug`, `name`, `licence`, `released_on`. Unique on `slug`.
- **Benchmark**: `id`, `slug`, `name`, `category`, `scale_min`, `scale_max`, `description`.
- **Score**: `id`, `model_id`, `benchmark_id`, `value`, `ci_low`, `ci_high`, `votes`, `scored_at`. Unique on `(model_id, benchmark_id, scored_at)`.
- **Category**: `slug` (text, coding, vision, math), `name`.
- **User**: `id`, `email`, `display_name`, `role` (member or admin), `created_at`.
- **Thread**: `id`, `category_slug`, `title`, `author_id`, `pinned`, `locked`, `created_at`.
- **Post**: `id`, `thread_id`, `author_id`, `body`, `hidden`, `created_at`.
- **Vote**: `post_id`, `user_id`. Unique on `(post_id, user_id)`.
- **Report**: `id`, `post_id`, `reporter_id`, `reason`, `created_at`.
