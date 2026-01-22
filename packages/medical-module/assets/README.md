# Medical Module Assets

This folder contains marketing and documentation assets for the Medical Professional Suite.

## Structure

```
assets/
├── images/       # Screenshots, feature images, hero banners
│   ├── hero.png
│   ├── dashboard.png
│   ├── vitals.png
│   └── ...
├── videos/       # Demo videos, feature walkthroughs
│   ├── intro.mp4
│   ├── demo.mp4
│   └── ...
└── README.md
```

## Usage

Assets are served from `/marketplace/assets/medical-module/{type}/{filename}`

In manifest.json, reference as:
```json
{
  "media": [
    { "type": "image", "url": "/marketplace/assets/medical-module/images/hero.png", "alt": "Medical Dashboard" },
    { "type": "video", "url": "/marketplace/assets/medical-module/videos/demo.mp4", "alt": "Feature Demo" }
  ]
}
```
