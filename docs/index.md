plugins:
  - jekyll-relative-links

relative_links:
  enabled: true
  collections: true

include:
  - README.md
  - LICENSE.md
  - TRACK_REPLACEMENT_PROGRESS.md

# Default layout if you don't specify one
defaults:
  - scope:
      path: ""
    values:
      layout: "default"
