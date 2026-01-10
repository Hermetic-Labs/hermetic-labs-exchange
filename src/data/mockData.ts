import { Author, Product, Category } from '../types';

export const authors: Author[] = [
  {
    "id": "eve-core",
    "name": "EVE Core Team",
    "avatar": "",
    "bio": "Core development team building enterprise-grade connectors and compliance modules for EVE-OS.",
    "socialLinks": {
      "website": "https://eve-os.dev"
    },
    "productCount": 21,
    "totalSales": 15000
  },
  {
    "id": "hermetic",
    "name": "Hermetic Labs",
    "avatar": "",
    "bio": "Creators of innovative visualization, gaming, and productivity components for the EVE-OS ecosystem.",
    "socialLinks": {
      "website": "https://hermetic.dev",
      "discord": "#"
    },
    "productCount": 7,
    "totalSales": 8500
  },
  {
    "id": "eve-os",
    "name": "EVE OS",
    "avatar": "",
    "bio": "Official EVE OS modules and integrations.",
    "socialLinks": {
      "website": "https://eve-os.dev"
    },
    "productCount": 1,
    "totalSales": 12000
  }
];

export const categories: Category[] = [
  {
    "id": "c1",
    "name": "Finance",
    "icon": "package",
    "productCount": 5
  },
  {
    "id": "c2",
    "name": "Infrastructure",
    "icon": "package",
    "productCount": 4
  },
  {
    "id": "c3",
    "name": "Compliance",
    "icon": "package",
    "productCount": 4
  },
  {
    "id": "c4",
    "name": "Enterprise",
    "icon": "package",
    "productCount": 4
  },
  {
    "id": "c5",
    "name": "Medical",
    "icon": "package",
    "productCount": 3
  },
  {
    "id": "c6",
    "name": "Lifestyle",
    "icon": "package",
    "productCount": 2
  },
  {
    "id": "c7",
    "name": "Tools",
    "icon": "package",
    "productCount": 2
  },
  {
    "id": "c8",
    "name": "Intelligence",
    "icon": "package",
    "productCount": 2
  },
  {
    "id": "c9",
    "name": "Professional",
    "icon": "package",
    "productCount": 2
  },
  {
    "id": "c10",
    "name": "Immersive",
    "icon": "package",
    "productCount": 1
  }
];

export const products: Product[] = [
  {
    "id": "p1",
    "title": "AWS S3 Connector",
    "slug": "aws-s3-connector",
    "price": 0,
    "discountPrice": undefined,
    "author": {
      "id": "eve-core",
      "name": "EVE Core Team",
      "avatar": "",
      "bio": "Core development team building enterprise-grade connectors and compliance modules for EVE-OS.",
      "socialLinks": {
        "website": "https://eve-os.dev"
      },
      "productCount": 21,
      "totalSales": 15000
    },
    "category": "Infrastructure",
    "media": [
      {
        "type": "image",
        "url": "http://localhost:8001/marketplace/assets/aws-s3-connector/images/hero.png"
      }
    ],
    "description": "Amazon S3 storage integration with buckets, objects, presigned URLs, and multipart uploads\n\n- Bucket management\n- Object CRUD\n- Presigned URLs\n- Multipart uploads\n- Lifecycle policies",
    "techSpecs": [
      {
        "label": "Type",
        "value": "Connector"
      },
      {
        "label": "Version",
        "value": "1.0.0"
      },
      {
        "label": "Feature",
        "value": "Bucket management"
      },
      {
        "label": "Feature",
        "value": "Object CRUD"
      },
      {
        "label": "Feature",
        "value": "Presigned URLs"
      },
      {
        "label": "Feature",
        "value": "Multipart uploads"
      },
      {
        "label": "Feature",
        "value": "Lifecycle policies"
      }
    ],
    "links": [
      {
        "label": "Documentation",
        "url": "#"
      }
    ],
    "questions": [],
    "reviews": [],
    "rating": 4.6,
    "reviewCount": 72,
    "releaseDate": "2024-12-01",
    "featured": true,
    "isNew": false
  },
  {
    "id": "p2",
    "title": "Azure Blob Storage Connector",
    "slug": "azure-blob-connector",
    "price": 0,
    "discountPrice": undefined,
    "author": {
      "id": "eve-core",
      "name": "EVE Core Team",
      "avatar": "",
      "bio": "Core development team building enterprise-grade connectors and compliance modules for EVE-OS.",
      "socialLinks": {
        "website": "https://eve-os.dev"
      },
      "productCount": 21,
      "totalSales": 15000
    },
    "category": "Infrastructure",
    "media": [
      {
        "type": "image",
        "url": "http://localhost:8001/marketplace/assets/azure-blob-connector/images/hero.png"
      }
    ],
    "description": "Azure Blob Storage integration with containers, blobs, and SAS tokens\n\n- Container management\n- Blob operations\n- SAS token generation\n- Access tier management\n- Lease handling",
    "techSpecs": [
      {
        "label": "Type",
        "value": "Connector"
      },
      {
        "label": "Version",
        "value": "1.0.0"
      },
      {
        "label": "Feature",
        "value": "Container management"
      },
      {
        "label": "Feature",
        "value": "Blob operations"
      },
      {
        "label": "Feature",
        "value": "SAS token generation"
      },
      {
        "label": "Feature",
        "value": "Access tier management"
      },
      {
        "label": "Feature",
        "value": "Lease handling"
      }
    ],
    "links": [
      {
        "label": "Documentation",
        "url": "#"
      }
    ],
    "questions": [],
    "reviews": [],
    "rating": 4.0,
    "reviewCount": 115,
    "releaseDate": "2024-12-01",
    "featured": true,
    "isNew": false
  },
  {
    "id": "p3",
    "title": "Beat Bubble VR",
    "slug": "beat-bubble-vr",
    "price": 0,
    "discountPrice": undefined,
    "author": {
      "id": "hermetic",
      "name": "Hermetic Labs",
      "avatar": "",
      "bio": "Creators of innovative visualization, gaming, and productivity components for the EVE-OS ecosystem.",
      "socialLinks": {
        "website": "https://hermetic.dev",
        "discord": "#"
      },
      "productCount": 7,
      "totalSales": 8500
    },
    "category": "Lifestyle",
    "media": [
      {
        "type": "image",
        "url": "http://localhost:8001/marketplace/assets/beat-bubble-vr/images/hero.png"
      }
    ],
    "description": "Immersive 3D spherical beat mixer game. Place beats on a spinning sphere inside a VR-ready environment. Features Web Audio API synthesis for kick, snare, hi-hat, bass, and synth sounds. Perfect for music creation and relaxation.\n\n- VR-ready 3D sphere environment\n- Web Audio API sound synthesis\n- 5 sound types (Kick, Snare, Hi-Hat, Bass, Synth)\n- 5 track lanes for beat placement\n- Adjustable tempo (60-180 BPM)\n- Click to place/remove beats\n- Drag to look around\n- Visual pulse feedback on trigger\n- No external audio files required",
    "techSpecs": [
      {
        "label": "Type",
        "value": "Component"
      },
      {
        "label": "Version",
        "value": "1.0.0"
      },
      {
        "label": "Feature",
        "value": "VR-ready 3D sphere environment"
      },
      {
        "label": "Feature",
        "value": "Web Audio API sound synthesis"
      },
      {
        "label": "Feature",
        "value": "5 sound types (Kick, Snare, Hi-Hat, Bass, Synth)"
      },
      {
        "label": "Feature",
        "value": "5 track lanes for beat placement"
      },
      {
        "label": "Feature",
        "value": "Adjustable tempo (60-180 BPM)"
      },
      {
        "label": "Feature",
        "value": "Click to place/remove beats"
      }
    ],
    "links": [
      {
        "label": "Documentation",
        "url": "#"
      }
    ],
    "questions": [],
    "reviews": [],
    "rating": 4.0,
    "reviewCount": 111,
    "releaseDate": "2024-12-01",
    "featured": true,
    "isNew": false
  },
  {
    "id": "p4",
    "title": "FedRAMP Compliance Suite",
    "slug": "fedramp-compliance",
    "price": 49.99,
    "discountPrice": 39.992000000000004,
    "author": {
      "id": "eve-core",
      "name": "EVE Core Team",
      "avatar": "",
      "bio": "Core development team building enterprise-grade connectors and compliance modules for EVE-OS.",
      "socialLinks": {
        "website": "https://eve-os.dev"
      },
      "productCount": 21,
      "totalSales": 15000
    },
    "category": "Compliance",
    "media": [
      {
        "type": "image",
        "url": "http://localhost:8001/marketplace/assets/fedramp-compliance/images/hero.png"
      }
    ],
    "description": "FedRAMP authorization compliance with security controls, continuous monitoring, and documentation\n\n- Control baseline assessment\n- Continuous monitoring\n- POA&M management\n- SSP documentation\n- Vulnerability scanning integration",
    "techSpecs": [
      {
        "label": "Type",
        "value": "Module"
      },
      {
        "label": "Version",
        "value": "1.0.0"
      },
      {
        "label": "Feature",
        "value": "Control baseline assessment"
      },
      {
        "label": "Feature",
        "value": "Continuous monitoring"
      },
      {
        "label": "Feature",
        "value": "POA&M management"
      },
      {
        "label": "Feature",
        "value": "SSP documentation"
      },
      {
        "label": "Feature",
        "value": "Vulnerability scanning integration"
      }
    ],
    "links": [
      {
        "label": "Documentation",
        "url": "#"
      }
    ],
    "questions": [],
    "reviews": [],
    "rating": 4.8,
    "reviewCount": 186,
    "releaseDate": "2024-12-01",
    "featured": true,
    "isNew": false
  },
  {
    "id": "p5",
    "title": "FHIR Compliance Suite",
    "slug": "fhir-compliance",
    "price": 49.99,
    "discountPrice": undefined,
    "author": {
      "id": "eve-core",
      "name": "EVE Core Team",
      "avatar": "",
      "bio": "Core development team building enterprise-grade connectors and compliance modules for EVE-OS.",
      "socialLinks": {
        "website": "https://eve-os.dev"
      },
      "productCount": 21,
      "totalSales": 15000
    },
    "category": "Medical",
    "media": [
      {
        "type": "image",
        "url": "http://localhost:8001/marketplace/assets/fhir-compliance/images/hero.png"
      }
    ],
    "description": "HL7 FHIR R4 compliance validation, resource management, and healthcare interoperability\n\n- FHIR R4 resource validation\n- Patient/Practitioner management\n- Observation and Condition handling\n- MedicationRequest processing\n- Bundle/Transaction support",
    "techSpecs": [
      {
        "label": "Type",
        "value": "Module"
      },
      {
        "label": "Version",
        "value": "1.0.0"
      },
      {
        "label": "Feature",
        "value": "FHIR R4 resource validation"
      },
      {
        "label": "Feature",
        "value": "Patient/Practitioner management"
      },
      {
        "label": "Feature",
        "value": "Observation and Condition handling"
      },
      {
        "label": "Feature",
        "value": "MedicationRequest processing"
      },
      {
        "label": "Feature",
        "value": "Bundle/Transaction support"
      }
    ],
    "links": [
      {
        "label": "Documentation",
        "url": "#"
      }
    ],
    "questions": [],
    "reviews": [],
    "rating": 4.4,
    "reviewCount": 153,
    "releaseDate": "2024-12-01",
    "featured": true,
    "isNew": false
  },
  {
    "id": "p6",
    "title": "Form Builder",
    "slug": "form-builder",
    "price": 0,
    "discountPrice": undefined,
    "author": {
      "id": "hermetic",
      "name": "Hermetic Labs",
      "avatar": "",
      "bio": "Creators of innovative visualization, gaming, and productivity components for the EVE-OS ecosystem.",
      "socialLinks": {
        "website": "https://hermetic.dev",
        "discord": "#"
      },
      "productCount": 7,
      "totalSales": 8500
    },
    "category": "Tools",
    "media": [
      {
        "type": "image",
        "url": "http://localhost:8001/marketplace/assets/form-builder/images/hero.png"
      }
    ],
    "description": "Drag-and-drop form builder with field palette, live preview, form sharing via URL encoding, and form submission handling. Supports text, email, number, date, select, checkbox, radio, textarea, signature, and file upload fields.\n\n- Drag-and-drop field placement\n- Live form preview\n- URL-encoded form sharing\n- Multiple field types (text, email, date, select, etc.)\n- Signature capture support\n- File upload fields\n- Form validation\n- LocalStorage persistence\n- Responsive design",
    "techSpecs": [
      {
        "label": "Type",
        "value": "Component"
      },
      {
        "label": "Version",
        "value": "1.0.0"
      },
      {
        "label": "Feature",
        "value": "Drag-and-drop field placement"
      },
      {
        "label": "Feature",
        "value": "Live form preview"
      },
      {
        "label": "Feature",
        "value": "URL-encoded form sharing"
      },
      {
        "label": "Feature",
        "value": "Multiple field types (text, email, date, select, etc.)"
      },
      {
        "label": "Feature",
        "value": "Signature capture support"
      },
      {
        "label": "Feature",
        "value": "File upload fields"
      }
    ],
    "links": [
      {
        "label": "Documentation",
        "url": "#"
      }
    ],
    "questions": [],
    "reviews": [],
    "rating": 4.9,
    "reviewCount": 102,
    "releaseDate": "2024-12-01",
    "featured": true,
    "isNew": false
  },
  {
    "id": "p7",
    "title": "Google Cloud Storage Connector",
    "slug": "gcs-connector",
    "price": 0,
    "discountPrice": undefined,
    "author": {
      "id": "eve-core",
      "name": "EVE Core Team",
      "avatar": "",
      "bio": "Core development team building enterprise-grade connectors and compliance modules for EVE-OS.",
      "socialLinks": {
        "website": "https://eve-os.dev"
      },
      "productCount": 21,
      "totalSales": 15000
    },
    "category": "Infrastructure",
    "media": [
      {
        "type": "image",
        "url": "http://localhost:8001/marketplace/assets/gcs-connector/images/hero.png"
      }
    ],
    "description": "Google Cloud Storage integration with buckets, objects, and signed URLs\n\n- Bucket operations\n- Object management\n- Signed URLs\n- IAM integration\n- Lifecycle management",
    "techSpecs": [
      {
        "label": "Type",
        "value": "Connector"
      },
      {
        "label": "Version",
        "value": "1.0.0"
      },
      {
        "label": "Feature",
        "value": "Bucket operations"
      },
      {
        "label": "Feature",
        "value": "Object management"
      },
      {
        "label": "Feature",
        "value": "Signed URLs"
      },
      {
        "label": "Feature",
        "value": "IAM integration"
      },
      {
        "label": "Feature",
        "value": "Lifecycle management"
      }
    ],
    "links": [
      {
        "label": "Documentation",
        "url": "#"
      }
    ],
    "questions": [],
    "reviews": [],
    "rating": 4.5,
    "reviewCount": 64,
    "releaseDate": "2024-12-01",
    "featured": false,
    "isNew": false
  },
  {
    "id": "p8",
    "title": "Globe Data Visualization",
    "slug": "globe-viz",
    "price": 0,
    "discountPrice": undefined,
    "author": {
      "id": "hermetic",
      "name": "Hermetic Labs",
      "avatar": "",
      "bio": "Creators of innovative visualization, gaming, and productivity components for the EVE-OS ecosystem.",
      "socialLinks": {
        "website": "https://hermetic.dev",
        "discord": "#"
      },
      "productCount": 7,
      "totalSales": 8500
    },
    "category": "Intelligence",
    "media": [
      {
        "type": "image",
        "url": "http://localhost:8001/marketplace/assets/globe-viz/images/hero.png"
      }
    ],
    "description": "Interactive 3D globe visualization with pluggable data adapters. Supports points, arcs, heatmaps, and flight paths. Perfect for displaying geographic data, network traffic, logistics, and analytics.\n\n- Interactive 3D globe with Three.js\n- Pluggable data adapter system\n- Flight tracking visualization\n- Network traffic heatmaps\n- Point markers with labels\n- Arc paths between locations\n- Auto-rotation mode\n- Custom data upload (JSON)\n- Real-time data updates\n- Click-to-select details panel",
    "techSpecs": [
      {
        "label": "Type",
        "value": "Component"
      },
      {
        "label": "Version",
        "value": "1.0.0"
      },
      {
        "label": "Feature",
        "value": "Interactive 3D globe with Three.js"
      },
      {
        "label": "Feature",
        "value": "Pluggable data adapter system"
      },
      {
        "label": "Feature",
        "value": "Flight tracking visualization"
      },
      {
        "label": "Feature",
        "value": "Network traffic heatmaps"
      },
      {
        "label": "Feature",
        "value": "Point markers with labels"
      },
      {
        "label": "Feature",
        "value": "Arc paths between locations"
      }
    ],
    "links": [
      {
        "label": "Documentation",
        "url": "#"
      }
    ],
    "questions": [],
    "reviews": [],
    "rating": 4.3,
    "reviewCount": 138,
    "releaseDate": "2024-12-01",
    "featured": false,
    "isNew": false
  },
  {
    "id": "p9",
    "title": "HIPAA Privacy Suite",
    "slug": "hipaa-compliance",
    "price": 49.99,
    "discountPrice": undefined,
    "author": {
      "id": "eve-core",
      "name": "EVE Core Team",
      "avatar": "",
      "bio": "Core development team building enterprise-grade connectors and compliance modules for EVE-OS.",
      "socialLinks": {
        "website": "https://eve-os.dev"
      },
      "productCount": 21,
      "totalSales": 15000
    },
    "category": "Medical",
    "media": [
      {
        "type": "image",
        "url": "http://localhost:8001/marketplace/assets/hipaa-compliance/images/hero.png"
      }
    ],
    "description": "HIPAA Privacy Rule compliance with PHI handling, access controls, and audit logging\n\n- PHI detection and masking\n- Minimum necessary enforcement\n- Access control validation\n- Audit trail logging\n- Breach notification support",
    "techSpecs": [
      {
        "label": "Type",
        "value": "Module"
      },
      {
        "label": "Version",
        "value": "1.0.0"
      },
      {
        "label": "Feature",
        "value": "PHI detection and masking"
      },
      {
        "label": "Feature",
        "value": "Minimum necessary enforcement"
      },
      {
        "label": "Feature",
        "value": "Access control validation"
      },
      {
        "label": "Feature",
        "value": "Audit trail logging"
      },
      {
        "label": "Feature",
        "value": "Breach notification support"
      }
    ],
    "links": [
      {
        "label": "Documentation",
        "url": "#"
      }
    ],
    "questions": [],
    "reviews": [],
    "rating": 4.9,
    "reviewCount": 197,
    "releaseDate": "2024-12-01",
    "featured": false,
    "isNew": false
  },
  {
    "id": "p10",
    "title": "HR & Payroll Portal",
    "slug": "hr-payroll-portal",
    "price": 49.99,
    "discountPrice": 39.992000000000004,
    "author": {
      "id": "hermetic",
      "name": "Hermetic Labs",
      "avatar": "",
      "bio": "Creators of innovative visualization, gaming, and productivity components for the EVE-OS ecosystem.",
      "socialLinks": {
        "website": "https://hermetic.dev",
        "discord": "#"
      },
      "productCount": 7,
      "totalSales": 8500
    },
    "category": "Enterprise",
    "media": [
      {
        "type": "image",
        "url": "http://localhost:8001/marketplace/assets/hr-payroll-portal/images/hero.png"
      }
    ],
    "description": "Complete HR management and payroll processing portal. Manage employees, departments, job postings, banking, payroll calculations, pay stubs, and integrations. Full-featured white-label HR solution.\n\n- Employee management with profiles\n- Department organization and budgets\n- Job posting board\n- Banking integrations\n- Third-party integrations (Gusto, ADP, etc.)\n- Payroll calculator with taxes\n- Bulk employee upload (CSV)\n- Pay stub generation (PDF)\n- Company settings and branding\n- Dashboard analytics",
    "techSpecs": [
      {
        "label": "Type",
        "value": "Plugin"
      },
      {
        "label": "Version",
        "value": "1.0.0"
      },
      {
        "label": "Feature",
        "value": "Employee management with profiles"
      },
      {
        "label": "Feature",
        "value": "Department organization and budgets"
      },
      {
        "label": "Feature",
        "value": "Job posting board"
      },
      {
        "label": "Feature",
        "value": "Banking integrations"
      },
      {
        "label": "Feature",
        "value": "Third-party integrations (Gusto, ADP, etc.)"
      },
      {
        "label": "Feature",
        "value": "Payroll calculator with taxes"
      }
    ],
    "links": [
      {
        "label": "Documentation",
        "url": "#"
      }
    ],
    "questions": [],
    "reviews": [],
    "rating": 4.3,
    "reviewCount": 45,
    "releaseDate": "2024-12-01",
    "featured": false,
    "isNew": false
  },
  {
    "id": "p11",
    "title": "IoT Device Connector",
    "slug": "iot-connector",
    "price": 0,
    "discountPrice": undefined,
    "author": {
      "id": "eve-core",
      "name": "EVE Core Team",
      "avatar": "",
      "bio": "Core development team building enterprise-grade connectors and compliance modules for EVE-OS.",
      "socialLinks": {
        "website": "https://eve-os.dev"
      },
      "productCount": 21,
      "totalSales": 15000
    },
    "category": "Infrastructure",
    "media": [
      {
        "type": "image",
        "url": "http://localhost:8001/marketplace/assets/iot-connector/images/hero.png"
      }
    ],
    "description": "Universal IoT device discovery, protocol handlers (HTTP/WebSocket/MQTT), workflow automation, and safety rules engine for smart home, medical devices, and industrial IoT\n\n- MDNS/SSDP device discovery\n- HTTP/WebSocket/MQTT protocol handlers\n- Device safety rules engine\n- Workflow automation engine\n- Device templates for common manufacturers\n- Medical device integration support\n- Rate limiting and error recovery",
    "techSpecs": [
      {
        "label": "Type",
        "value": "Connector"
      },
      {
        "label": "Version",
        "value": "1.0.0"
      },
      {
        "label": "Feature",
        "value": "MDNS/SSDP device discovery"
      },
      {
        "label": "Feature",
        "value": "HTTP/WebSocket/MQTT protocol handlers"
      },
      {
        "label": "Feature",
        "value": "Device safety rules engine"
      },
      {
        "label": "Feature",
        "value": "Workflow automation engine"
      },
      {
        "label": "Feature",
        "value": "Device templates for common manufacturers"
      },
      {
        "label": "Feature",
        "value": "Medical device integration support"
      }
    ],
    "links": [
      {
        "label": "Documentation",
        "url": "#"
      }
    ],
    "questions": [],
    "reviews": [],
    "rating": 4.1,
    "reviewCount": 18,
    "releaseDate": "2024-12-01",
    "featured": false,
    "isNew": false
  },
  {
    "id": "p12",
    "title": "ITAR Compliance Suite",
    "slug": "itar-compliance",
    "price": 49.99,
    "discountPrice": undefined,
    "author": {
      "id": "eve-core",
      "name": "EVE Core Team",
      "avatar": "",
      "bio": "Core development team building enterprise-grade connectors and compliance modules for EVE-OS.",
      "socialLinks": {
        "website": "https://eve-os.dev"
      },
      "productCount": 21,
      "totalSales": 15000
    },
    "category": "Compliance",
    "media": [
      {
        "type": "image",
        "url": "http://localhost:8001/marketplace/assets/itar-compliance/images/hero.png"
      }
    ],
    "description": "ITAR export control compliance for defense articles and technical data\n\n- USML classification\n- Export license tracking\n- Foreign person screening\n- Technical data controls\n- Audit reporting",
    "techSpecs": [
      {
        "label": "Type",
        "value": "Module"
      },
      {
        "label": "Version",
        "value": "1.0.0"
      },
      {
        "label": "Feature",
        "value": "USML classification"
      },
      {
        "label": "Feature",
        "value": "Export license tracking"
      },
      {
        "label": "Feature",
        "value": "Foreign person screening"
      },
      {
        "label": "Feature",
        "value": "Technical data controls"
      },
      {
        "label": "Feature",
        "value": "Audit reporting"
      }
    ],
    "links": [
      {
        "label": "Documentation",
        "url": "#"
      }
    ],
    "questions": [],
    "reviews": [],
    "rating": 4.2,
    "reviewCount": 31,
    "releaseDate": "2024-12-01",
    "featured": false,
    "isNew": false
  },
  {
    "id": "p13",
    "title": "LexisNexis Connector",
    "slug": "lexisnexis-connector",
    "price": 49.99,
    "discountPrice": 39.992000000000004,
    "author": {
      "id": "eve-core",
      "name": "EVE Core Team",
      "avatar": "",
      "bio": "Core development team building enterprise-grade connectors and compliance modules for EVE-OS.",
      "socialLinks": {
        "website": "https://eve-os.dev"
      },
      "productCount": 21,
      "totalSales": 15000
    },
    "category": "Professional",
    "media": [
      {
        "type": "image",
        "url": "http://localhost:8001/marketplace/assets/lexisnexis-connector/images/hero.png"
      }
    ],
    "description": "LexisNexis legal research integration with document search, case law, and statutes\n\n- Document search\n- Case law retrieval\n- Statutory research\n- Citation analysis\n- Shepardizing",
    "techSpecs": [
      {
        "label": "Type",
        "value": "Connector"
      },
      {
        "label": "Version",
        "value": "1.0.0"
      },
      {
        "label": "Feature",
        "value": "Document search"
      },
      {
        "label": "Feature",
        "value": "Case law retrieval"
      },
      {
        "label": "Feature",
        "value": "Statutory research"
      },
      {
        "label": "Feature",
        "value": "Citation analysis"
      },
      {
        "label": "Feature",
        "value": "Shepardizing"
      }
    ],
    "links": [
      {
        "label": "Documentation",
        "url": "#"
      }
    ],
    "questions": [],
    "reviews": [],
    "rating": 4.9,
    "reviewCount": 101,
    "releaseDate": "2024-12-01",
    "featured": false,
    "isNew": false
  },
  {
    "id": "p14",
    "title": "Medical Professional Suite",
    "slug": "medical-module",
    "price": 49.99,
    "discountPrice": undefined,
    "author": {
      "id": "eve-os",
      "name": "EVE OS",
      "avatar": "",
      "bio": "Official EVE OS modules and integrations.",
      "socialLinks": {
        "website": "https://eve-os.dev"
      },
      "productCount": 1,
      "totalSales": 12000
    },
    "category": "Medical",
    "media": [
      {
        "type": "image",
        "url": "http://localhost:8001/marketplace/assets/medical-module/images/hero.png"
      }
    ],
    "description": "Complete medical module with bedside assistant, nurse station dashboard, FHIR integration, vitals monitoring, and fall detection\n\n- Real-time vitals monitoring\n- Fall detection with nurse overflow\n- FHIR R4 import/export\n- Multi-room nurse station\n- Video call integration\n- Patient intake forms\n- HealthKit integration",
    "techSpecs": [
      {
        "label": "Type",
        "value": "Module"
      },
      {
        "label": "Version",
        "value": "2.0.0"
      },
      {
        "label": "Feature",
        "value": "Real-time vitals monitoring"
      },
      {
        "label": "Feature",
        "value": "Fall detection with nurse overflow"
      },
      {
        "label": "Feature",
        "value": "FHIR R4 import/export"
      },
      {
        "label": "Feature",
        "value": "Multi-room nurse station"
      },
      {
        "label": "Feature",
        "value": "Video call integration"
      },
      {
        "label": "Feature",
        "value": "Patient intake forms"
      }
    ],
    "links": [
      {
        "label": "Documentation",
        "url": "#"
      }
    ],
    "questions": [],
    "reviews": [],
    "rating": 4.1,
    "reviewCount": 24,
    "releaseDate": "2024-12-01",
    "featured": false,
    "isNew": false
  },
  {
    "id": "p15",
    "title": "PCI DSS Compliance Suite",
    "slug": "pci-compliance",
    "price": 49.99,
    "discountPrice": undefined,
    "author": {
      "id": "eve-core",
      "name": "EVE Core Team",
      "avatar": "",
      "bio": "Core development team building enterprise-grade connectors and compliance modules for EVE-OS.",
      "socialLinks": {
        "website": "https://eve-os.dev"
      },
      "productCount": 21,
      "totalSales": 15000
    },
    "category": "Finance",
    "media": [
      {
        "type": "image",
        "url": "http://localhost:8001/marketplace/assets/pci-compliance/images/hero.png"
      }
    ],
    "description": "PCI DSS compliance for payment card security, cardholder data protection, and network security\n\n- Cardholder data protection\n- Network security validation\n- Access control management\n- Vulnerability management\n- SAQ preparation",
    "techSpecs": [
      {
        "label": "Type",
        "value": "Module"
      },
      {
        "label": "Version",
        "value": "1.0.0"
      },
      {
        "label": "Feature",
        "value": "Cardholder data protection"
      },
      {
        "label": "Feature",
        "value": "Network security validation"
      },
      {
        "label": "Feature",
        "value": "Access control management"
      },
      {
        "label": "Feature",
        "value": "Vulnerability management"
      },
      {
        "label": "Feature",
        "value": "SAQ preparation"
      }
    ],
    "links": [
      {
        "label": "Documentation",
        "url": "#"
      }
    ],
    "questions": [],
    "reviews": [],
    "rating": 4.7,
    "reviewCount": 78,
    "releaseDate": "2024-12-01",
    "featured": false,
    "isNew": false
  },
  {
    "id": "p16",
    "title": "Plaid Connector",
    "slug": "plaid-connector",
    "price": 49.99,
    "discountPrice": 39.992000000000004,
    "author": {
      "id": "eve-core",
      "name": "EVE Core Team",
      "avatar": "",
      "bio": "Core development team building enterprise-grade connectors and compliance modules for EVE-OS.",
      "socialLinks": {
        "website": "https://eve-os.dev"
      },
      "productCount": 21,
      "totalSales": 15000
    },
    "category": "Finance",
    "media": [
      {
        "type": "image",
        "url": "http://localhost:8001/marketplace/assets/plaid-connector/images/hero.png"
      }
    ],
    "description": "Full Plaid integration with Link token flow, transactions, identity, auth, balances, investments, liabilities, and webhooks\n\n- Link token creation\n- Transaction sync\n- Identity verification\n- ACH authentication\n- Investment holdings\n- Liabilities tracking\n- Webhook handling",
    "techSpecs": [
      {
        "label": "Type",
        "value": "Connector"
      },
      {
        "label": "Version",
        "value": "1.0.0"
      },
      {
        "label": "Feature",
        "value": "Link token creation"
      },
      {
        "label": "Feature",
        "value": "Transaction sync"
      },
      {
        "label": "Feature",
        "value": "Identity verification"
      },
      {
        "label": "Feature",
        "value": "ACH authentication"
      },
      {
        "label": "Feature",
        "value": "Investment holdings"
      },
      {
        "label": "Feature",
        "value": "Liabilities tracking"
      }
    ],
    "links": [
      {
        "label": "Documentation",
        "url": "#"
      }
    ],
    "questions": [],
    "reviews": [],
    "rating": 4.0,
    "reviewCount": 13,
    "releaseDate": "2024-12-01",
    "featured": false,
    "isNew": false
  },
  {
    "id": "p17",
    "title": "Super Platformer",
    "slug": "platformer-game",
    "price": 0,
    "discountPrice": undefined,
    "author": {
      "id": "hermetic",
      "name": "Hermetic Labs",
      "avatar": "",
      "bio": "Creators of innovative visualization, gaming, and productivity components for the EVE-OS ecosystem.",
      "socialLinks": {
        "website": "https://hermetic.dev",
        "discord": "#"
      },
      "productCount": 7,
      "totalSales": 8500
    },
    "category": "Lifestyle",
    "media": [
      {
        "type": "image",
        "url": "http://localhost:8001/marketplace/assets/platformer-game/images/hero.png"
      }
    ],
    "description": "Classic side-scrolling platformer game in the style of Mario. Features pixel art graphics, coin collection, enemies to defeat, platforms to navigate, and a flag to reach. Mobile-ready with touch controls.\n\n- Classic platformer gameplay\n- Pixel art retro graphics\n- Coin collection system\n- Enemy AI with patrol patterns\n- Stomp-to-defeat mechanic\n- Multiple platform types (ground, brick, question blocks)\n- Side-scrolling camera\n- Mobile touch controls\n- Win/lose states\n- Score tracking",
    "techSpecs": [
      {
        "label": "Type",
        "value": "Component"
      },
      {
        "label": "Version",
        "value": "1.0.0"
      },
      {
        "label": "Feature",
        "value": "Classic platformer gameplay"
      },
      {
        "label": "Feature",
        "value": "Pixel art retro graphics"
      },
      {
        "label": "Feature",
        "value": "Coin collection system"
      },
      {
        "label": "Feature",
        "value": "Enemy AI with patrol patterns"
      },
      {
        "label": "Feature",
        "value": "Stomp-to-defeat mechanic"
      },
      {
        "label": "Feature",
        "value": "Multiple platform types (ground, brick, question blocks)"
      }
    ],
    "links": [
      {
        "label": "Documentation",
        "url": "#"
      }
    ],
    "questions": [],
    "reviews": [],
    "rating": 4.7,
    "reviewCount": 82,
    "releaseDate": "2024-12-01",
    "featured": false,
    "isNew": false
  },
  {
    "id": "p18",
    "title": "Salesforce Connector",
    "slug": "salesforce-connector",
    "price": 49.99,
    "discountPrice": undefined,
    "author": {
      "id": "eve-core",
      "name": "EVE Core Team",
      "avatar": "",
      "bio": "Core development team building enterprise-grade connectors and compliance modules for EVE-OS.",
      "socialLinks": {
        "website": "https://eve-os.dev"
      },
      "productCount": 21,
      "totalSales": 15000
    },
    "category": "Enterprise",
    "media": [
      {
        "type": "image",
        "url": "http://localhost:8001/marketplace/assets/salesforce-connector/images/hero.png"
      }
    ],
    "description": "Full Salesforce CRM integration with objects, SOQL queries, bulk operations, and streaming API\n\n- OAuth2 authentication\n- SOQL query execution\n- Object CRUD operations\n- Bulk data operations\n- Real-time streaming API",
    "techSpecs": [
      {
        "label": "Type",
        "value": "Connector"
      },
      {
        "label": "Version",
        "value": "1.0.0"
      },
      {
        "label": "Feature",
        "value": "OAuth2 authentication"
      },
      {
        "label": "Feature",
        "value": "SOQL query execution"
      },
      {
        "label": "Feature",
        "value": "Object CRUD operations"
      },
      {
        "label": "Feature",
        "value": "Bulk data operations"
      },
      {
        "label": "Feature",
        "value": "Real-time streaming API"
      }
    ],
    "links": [
      {
        "label": "Documentation",
        "url": "#"
      }
    ],
    "questions": [],
    "reviews": [],
    "rating": 4.7,
    "reviewCount": 180,
    "releaseDate": "2024-12-01",
    "featured": false,
    "isNew": false
  },
  {
    "id": "p19",
    "title": "SAM.gov Connector",
    "slug": "sam-gov-connector",
    "price": 0,
    "discountPrice": undefined,
    "author": {
      "id": "eve-core",
      "name": "EVE Core Team",
      "avatar": "",
      "bio": "Core development team building enterprise-grade connectors and compliance modules for EVE-OS.",
      "socialLinks": {
        "website": "https://eve-os.dev"
      },
      "productCount": 21,
      "totalSales": 15000
    },
    "category": "Compliance",
    "media": [
      {
        "type": "image",
        "url": "http://localhost:8001/marketplace/assets/sam-gov-connector/images/hero.png"
      }
    ],
    "description": "SAM.gov federal contractor registration and entity search integration\n\n- Entity search\n- Registration status\n- Exclusion records\n- Contract opportunities\n- Cage code lookup",
    "techSpecs": [
      {
        "label": "Type",
        "value": "Connector"
      },
      {
        "label": "Version",
        "value": "1.0.0"
      },
      {
        "label": "Feature",
        "value": "Entity search"
      },
      {
        "label": "Feature",
        "value": "Registration status"
      },
      {
        "label": "Feature",
        "value": "Exclusion records"
      },
      {
        "label": "Feature",
        "value": "Contract opportunities"
      },
      {
        "label": "Feature",
        "value": "Cage code lookup"
      }
    ],
    "links": [
      {
        "label": "Documentation",
        "url": "#"
      }
    ],
    "questions": [],
    "reviews": [],
    "rating": 4.2,
    "reviewCount": 35,
    "releaseDate": "2024-12-01",
    "featured": false,
    "isNew": false
  },
  {
    "id": "p20",
    "title": "SAP Connector",
    "slug": "sap-connector",
    "price": 49.99,
    "discountPrice": undefined,
    "author": {
      "id": "eve-core",
      "name": "EVE Core Team",
      "avatar": "",
      "bio": "Core development team building enterprise-grade connectors and compliance modules for EVE-OS.",
      "socialLinks": {
        "website": "https://eve-os.dev"
      },
      "productCount": 21,
      "totalSales": 15000
    },
    "category": "Enterprise",
    "media": [
      {
        "type": "image",
        "url": "http://localhost:8001/marketplace/assets/sap-connector/images/hero.png"
      }
    ],
    "description": "SAP ERP integration with RFC, BAPI, OData services, and IDoc support\n\n- RFC function calls\n- BAPI execution\n- OData service integration\n- IDoc processing\n- Material/vendor management",
    "techSpecs": [
      {
        "label": "Type",
        "value": "Connector"
      },
      {
        "label": "Version",
        "value": "1.0.0"
      },
      {
        "label": "Feature",
        "value": "RFC function calls"
      },
      {
        "label": "Feature",
        "value": "BAPI execution"
      },
      {
        "label": "Feature",
        "value": "OData service integration"
      },
      {
        "label": "Feature",
        "value": "IDoc processing"
      },
      {
        "label": "Feature",
        "value": "Material/vendor management"
      }
    ],
    "links": [
      {
        "label": "Documentation",
        "url": "#"
      }
    ],
    "questions": [],
    "reviews": [],
    "rating": 4.1,
    "reviewCount": 120,
    "releaseDate": "2024-12-01",
    "featured": false,
    "isNew": false
  },
  {
    "id": "p21",
    "title": "SOX Compliance Suite",
    "slug": "sox-compliance",
    "price": 49.99,
    "discountPrice": undefined,
    "author": {
      "id": "eve-core",
      "name": "EVE Core Team",
      "avatar": "",
      "bio": "Core development team building enterprise-grade connectors and compliance modules for EVE-OS.",
      "socialLinks": {
        "website": "https://eve-os.dev"
      },
      "productCount": 21,
      "totalSales": 15000
    },
    "category": "Finance",
    "media": [
      {
        "type": "image",
        "url": "http://localhost:8001/marketplace/assets/sox-compliance/images/hero.png"
      }
    ],
    "description": "Sarbanes-Oxley compliance for financial controls, audit trails, and internal controls\n\n- Control documentation\n- Audit trail management\n- Segregation of duties\n- Access control reviews\n- Deficiency reporting",
    "techSpecs": [
      {
        "label": "Type",
        "value": "Module"
      },
      {
        "label": "Version",
        "value": "1.0.0"
      },
      {
        "label": "Feature",
        "value": "Control documentation"
      },
      {
        "label": "Feature",
        "value": "Audit trail management"
      },
      {
        "label": "Feature",
        "value": "Segregation of duties"
      },
      {
        "label": "Feature",
        "value": "Access control reviews"
      },
      {
        "label": "Feature",
        "value": "Deficiency reporting"
      }
    ],
    "links": [
      {
        "label": "Documentation",
        "url": "#"
      }
    ],
    "questions": [],
    "reviews": [],
    "rating": 4.6,
    "reviewCount": 167,
    "releaseDate": "2024-12-01",
    "featured": false,
    "isNew": false
  },
  {
    "id": "p22",
    "title": "3D Stock Visualizer",
    "slug": "stock-visualizer",
    "price": 0,
    "discountPrice": undefined,
    "author": {
      "id": "hermetic",
      "name": "Hermetic Labs",
      "avatar": "",
      "bio": "Creators of innovative visualization, gaming, and productivity components for the EVE-OS ecosystem.",
      "socialLinks": {
        "website": "https://hermetic.dev",
        "discord": "#"
      },
      "productCount": 7,
      "totalSales": 8500
    },
    "category": "Finance",
    "media": [
      {
        "type": "image",
        "url": "http://localhost:8001/marketplace/assets/stock-visualizer/images/hero.png"
      }
    ],
    "description": "Interactive 3D candlestick chart with real-time strategy coding. Write trading strategies in a simple DSL, see buy/sell signals visualized on the chart. Supports 2D/3D views, SMA/EMA indicators, and timeline scrubbing.\n\n- 3D and 2D candlestick charts\n- Real-time strategy DSL editor\n- SMA and EMA indicators\n- Buy/sell signal visualization\n- Timeline scrubbing and zoom\n- Adjustable window size\n- Price change tracking\n- Drag-to-rotate 3D view",
    "techSpecs": [
      {
        "label": "Type",
        "value": "Component"
      },
      {
        "label": "Version",
        "value": "1.0.0"
      },
      {
        "label": "Feature",
        "value": "3D and 2D candlestick charts"
      },
      {
        "label": "Feature",
        "value": "Real-time strategy DSL editor"
      },
      {
        "label": "Feature",
        "value": "SMA and EMA indicators"
      },
      {
        "label": "Feature",
        "value": "Buy/sell signal visualization"
      },
      {
        "label": "Feature",
        "value": "Timeline scrubbing and zoom"
      },
      {
        "label": "Feature",
        "value": "Adjustable window size"
      }
    ],
    "links": [
      {
        "label": "Documentation",
        "url": "#"
      }
    ],
    "questions": [],
    "reviews": [],
    "rating": 4.7,
    "reviewCount": 80,
    "releaseDate": "2024-12-01",
    "featured": false,
    "isNew": false
  },
  {
    "id": "p23",
    "title": "Stripe Connector",
    "slug": "stripe-connector",
    "price": 49.99,
    "discountPrice": undefined,
    "author": {
      "id": "eve-core",
      "name": "EVE Core Team",
      "avatar": "",
      "bio": "Core development team building enterprise-grade connectors and compliance modules for EVE-OS.",
      "socialLinks": {
        "website": "https://eve-os.dev"
      },
      "productCount": 21,
      "totalSales": 15000
    },
    "category": "Finance",
    "media": [
      {
        "type": "image",
        "url": "http://localhost:8001/marketplace/assets/stripe-connector/images/hero.png"
      }
    ],
    "description": "Stripe payment integration with charges, subscriptions, customers, and webhooks\n\n- Payment intents\n- Subscription management\n- Customer management\n- Webhook handling\n- Invoice generation",
    "techSpecs": [
      {
        "label": "Type",
        "value": "Connector"
      },
      {
        "label": "Version",
        "value": "1.0.0"
      },
      {
        "label": "Feature",
        "value": "Payment intents"
      },
      {
        "label": "Feature",
        "value": "Subscription management"
      },
      {
        "label": "Feature",
        "value": "Customer management"
      },
      {
        "label": "Feature",
        "value": "Webhook handling"
      },
      {
        "label": "Feature",
        "value": "Invoice generation"
      }
    ],
    "links": [
      {
        "label": "Documentation",
        "url": "#"
      }
    ],
    "questions": [],
    "reviews": [],
    "rating": 4.7,
    "reviewCount": 83,
    "releaseDate": "2024-12-01",
    "featured": false,
    "isNew": false
  },
  {
    "id": "p24",
    "title": "USASpending Connector",
    "slug": "usaspending-connector",
    "price": 0,
    "discountPrice": undefined,
    "author": {
      "id": "eve-core",
      "name": "EVE Core Team",
      "avatar": "",
      "bio": "Core development team building enterprise-grade connectors and compliance modules for EVE-OS.",
      "socialLinks": {
        "website": "https://eve-os.dev"
      },
      "productCount": 21,
      "totalSales": 15000
    },
    "category": "Compliance",
    "media": [
      {
        "type": "image",
        "url": "http://localhost:8001/marketplace/assets/usaspending-connector/images/hero.png"
      }
    ],
    "description": "USASpending.gov federal spending data integration for awards, agencies, and recipients\n\n- Award search\n- Agency spending\n- Recipient lookup\n- Geographic analysis\n- Time series data",
    "techSpecs": [
      {
        "label": "Type",
        "value": "Connector"
      },
      {
        "label": "Version",
        "value": "1.0.0"
      },
      {
        "label": "Feature",
        "value": "Award search"
      },
      {
        "label": "Feature",
        "value": "Agency spending"
      },
      {
        "label": "Feature",
        "value": "Recipient lookup"
      },
      {
        "label": "Feature",
        "value": "Geographic analysis"
      },
      {
        "label": "Feature",
        "value": "Time series data"
      }
    ],
    "links": [
      {
        "label": "Documentation",
        "url": "#"
      }
    ],
    "questions": [],
    "reviews": [],
    "rating": 4.1,
    "reviewCount": 18,
    "releaseDate": "2024-12-01",
    "featured": false,
    "isNew": false
  },
  {
    "id": "p25",
    "title": "Voice Connector",
    "slug": "voice-connector",
    "price": 0,
    "discountPrice": undefined,
    "author": {
      "id": "eve-core",
      "name": "EVE Core Team",
      "avatar": "",
      "bio": "Core development team building enterprise-grade connectors and compliance modules for EVE-OS.",
      "socialLinks": {
        "website": "https://eve-os.dev"
      },
      "productCount": 21,
      "totalSales": 15000
    },
    "category": "Tools",
    "media": [
      {
        "type": "image",
        "url": "http://localhost:8001/marketplace/assets/voice-connector/images/hero.png"
      }
    ],
    "description": "Voice recognition, command processing, and voice-to-reflex-card integration for hands-free operation\n\n- Speech-to-text recognition\n- Natural language command parsing\n- Voice-to-reflex-card conversion\n- Continuous listening mode\n- Multi-language support",
    "techSpecs": [
      {
        "label": "Type",
        "value": "Connector"
      },
      {
        "label": "Version",
        "value": "1.0.0"
      },
      {
        "label": "Feature",
        "value": "Speech-to-text recognition"
      },
      {
        "label": "Feature",
        "value": "Natural language command parsing"
      },
      {
        "label": "Feature",
        "value": "Voice-to-reflex-card conversion"
      },
      {
        "label": "Feature",
        "value": "Continuous listening mode"
      },
      {
        "label": "Feature",
        "value": "Multi-language support"
      }
    ],
    "links": [
      {
        "label": "Documentation",
        "url": "#"
      }
    ],
    "questions": [],
    "reviews": [],
    "rating": 4.6,
    "reviewCount": 169,
    "releaseDate": "2024-12-01",
    "featured": false,
    "isNew": true
  },
  {
    "id": "p26",
    "title": "VR Spatial Engine",
    "slug": "vr-spatial-engine",
    "price": 49.99,
    "discountPrice": undefined,
    "author": {
      "id": "eve-core",
      "name": "EVE Core Team",
      "avatar": "",
      "bio": "Core development team building enterprise-grade connectors and compliance modules for EVE-OS.",
      "socialLinks": {
        "website": "https://eve-os.dev"
      },
      "productCount": 21,
      "totalSales": 15000
    },
    "category": "Immersive",
    "media": [
      {
        "type": "image",
        "url": "http://localhost:8001/marketplace/assets/vr-spatial-engine/images/hero.png"
      }
    ],
    "description": "VR/XR capability component - enables VR mode across EVE-OS when installed\n\n- Real-time VR scene generation\n- WebXR compatibility\n- Node-based visual editor\n- Spatial tracking integration\n- Hand tracking support\n- Eye tracking capabilities\n- Cross-platform VR support",
    "techSpecs": [
      {
        "label": "Type",
        "value": "Component"
      },
      {
        "label": "Version",
        "value": "1.0.0"
      },
      {
        "label": "Feature",
        "value": "Real-time VR scene generation"
      },
      {
        "label": "Feature",
        "value": "WebXR compatibility"
      },
      {
        "label": "Feature",
        "value": "Node-based visual editor"
      },
      {
        "label": "Feature",
        "value": "Spatial tracking integration"
      },
      {
        "label": "Feature",
        "value": "Hand tracking support"
      },
      {
        "label": "Feature",
        "value": "Eye tracking capabilities"
      }
    ],
    "links": [
      {
        "label": "Documentation",
        "url": "#"
      }
    ],
    "questions": [],
    "reviews": [],
    "rating": 4.2,
    "reviewCount": 35,
    "releaseDate": "2024-12-01",
    "featured": false,
    "isNew": true
  },
  {
    "id": "p27",
    "title": "VRM Companion",
    "slug": "vrm-companion",
    "price": 0,
    "discountPrice": undefined,
    "author": {
      "id": "hermetic",
      "name": "Hermetic Labs",
      "avatar": "",
      "bio": "Creators of innovative visualization, gaming, and productivity components for the EVE-OS ecosystem.",
      "socialLinks": {
        "website": "https://hermetic.dev",
        "discord": "#"
      },
      "productCount": 7,
      "totalSales": 8500
    },
    "category": "Intelligence",
    "media": [
      {
        "type": "image",
        "url": "http://localhost:8001/marketplace/assets/vrm-companion/images/hero.png"
      }
    ],
    "description": "3D VRM avatar companion with lip-syncing, phoneme-driven animation, and EVE Core integration. Can swap EVE's sphere representation with a full VRM character.\n\n- VRM 1.0 avatar loading\n- Phoneme-driven lip sync\n- Amplitude fallback mode\n- Real-time viseme visualization\n- EVE Core sphere replacement\n- VR-ready when vr-spatial-engine installed\n- Configurable smoothing, gain, and mouth open limits",
    "techSpecs": [
      {
        "label": "Type",
        "value": "Component"
      },
      {
        "label": "Version",
        "value": "1.0.0"
      },
      {
        "label": "Feature",
        "value": "VRM 1.0 avatar loading"
      },
      {
        "label": "Feature",
        "value": "Phoneme-driven lip sync"
      },
      {
        "label": "Feature",
        "value": "Amplitude fallback mode"
      },
      {
        "label": "Feature",
        "value": "Real-time viseme visualization"
      },
      {
        "label": "Feature",
        "value": "EVE Core sphere replacement"
      },
      {
        "label": "Feature",
        "value": "VR-ready when vr-spatial-engine installed"
      }
    ],
    "links": [
      {
        "label": "Documentation",
        "url": "#"
      }
    ],
    "questions": [],
    "reviews": [],
    "rating": 4.4,
    "reviewCount": 46,
    "releaseDate": "2024-12-01",
    "featured": false,
    "isNew": true
  },
  {
    "id": "p28",
    "title": "Westlaw Connector",
    "slug": "westlaw-connector",
    "price": 49.99,
    "discountPrice": 39.992000000000004,
    "author": {
      "id": "eve-core",
      "name": "EVE Core Team",
      "avatar": "",
      "bio": "Core development team building enterprise-grade connectors and compliance modules for EVE-OS.",
      "socialLinks": {
        "website": "https://eve-os.dev"
      },
      "productCount": 21,
      "totalSales": 15000
    },
    "category": "Professional",
    "media": [
      {
        "type": "image",
        "url": "http://localhost:8001/marketplace/assets/westlaw-connector/images/hero.png"
      }
    ],
    "description": "Westlaw legal research integration with KeyCite, documents, and statutes\n\n- Document search\n- KeyCite validation\n- Case law research\n- Statute annotations\n- Secondary sources",
    "techSpecs": [
      {
        "label": "Type",
        "value": "Connector"
      },
      {
        "label": "Version",
        "value": "1.0.0"
      },
      {
        "label": "Feature",
        "value": "Document search"
      },
      {
        "label": "Feature",
        "value": "KeyCite validation"
      },
      {
        "label": "Feature",
        "value": "Case law research"
      },
      {
        "label": "Feature",
        "value": "Statute annotations"
      },
      {
        "label": "Feature",
        "value": "Secondary sources"
      }
    ],
    "links": [
      {
        "label": "Documentation",
        "url": "#"
      }
    ],
    "questions": [],
    "reviews": [],
    "rating": 4.0,
    "reviewCount": 10,
    "releaseDate": "2024-12-01",
    "featured": false,
    "isNew": true
  },
  {
    "id": "p29",
    "title": "Workday Connector",
    "slug": "workday-connector",
    "price": 49.99,
    "discountPrice": undefined,
    "author": {
      "id": "eve-core",
      "name": "EVE Core Team",
      "avatar": "",
      "bio": "Core development team building enterprise-grade connectors and compliance modules for EVE-OS.",
      "socialLinks": {
        "website": "https://eve-os.dev"
      },
      "productCount": 21,
      "totalSales": 15000
    },
    "category": "Enterprise",
    "media": [
      {
        "type": "image",
        "url": "http://localhost:8001/marketplace/assets/workday-connector/images/hero.png"
      }
    ],
    "description": "Workday HCM integration with workers, positions, organizations, and payroll\n\n- Worker management\n- Position tracking\n- Organization hierarchy\n- Payroll integration\n- Benefits administration",
    "techSpecs": [
      {
        "label": "Type",
        "value": "Connector"
      },
      {
        "label": "Version",
        "value": "1.0.0"
      },
      {
        "label": "Feature",
        "value": "Worker management"
      },
      {
        "label": "Feature",
        "value": "Position tracking"
      },
      {
        "label": "Feature",
        "value": "Organization hierarchy"
      },
      {
        "label": "Feature",
        "value": "Payroll integration"
      },
      {
        "label": "Feature",
        "value": "Benefits administration"
      }
    ],
    "links": [
      {
        "label": "Documentation",
        "url": "#"
      }
    ],
    "questions": [],
    "reviews": [],
    "rating": 4.5,
    "reviewCount": 162,
    "releaseDate": "2024-12-01",
    "featured": false,
    "isNew": true
  }
];

export const upcomingProducts = [
  { id: 'u1', title: 'Neural Flow Editor', releaseDate: '2025-02-01', author: authors[1] },
  { id: 'u2', title: 'HIPAA Audit Dashboard', releaseDate: '2025-02-15', author: authors[0] },
];
