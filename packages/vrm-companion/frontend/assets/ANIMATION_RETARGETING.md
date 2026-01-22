# Animation Retargeting Guide

## Folder Structure

```
animations/
├── mixamo/           # Mixamo FBX animations (mixamorigXxx bone naming)
│   └── Standing Idle.fbx
├── cc4/              # Character Creator 4 native animations (CC_Base_Xxx bone naming)
│   └── (add CC4 animations here)
└── ANIMATION_RETARGETING.md
```

---

## Bone Naming Conventions

### Mixamo Bones (mixamorigXxx)
```
mixamorigHips
├── mixamorigSpine
│   ├── mixamorigSpine1
│   │   ├── mixamorigSpine2
│   │   │   ├── mixamorigNeck
│   │   │   │   └── mixamorigHead
│   │   │   ├── mixamorigLeftShoulder
│   │   │   │   └── mixamorigLeftArm
│   │   │   │       └── mixamorigLeftForeArm
│   │   │   │           └── mixamorigLeftHand
│   │   │   └── mixamorigRightShoulder
│   │   │       └── mixamorigRightArm
│   │   │           └── mixamorigRightForeArm
│   │   │               └── mixamorigRightHand
├── mixamorigLeftUpLeg
│   └── mixamorigLeftLeg
│       └── mixamorigLeftFoot
│           └── mixamorigLeftToeBase
└── mixamorigRightUpLeg
    └── mixamorigRightLeg
        └── mixamorigRightFoot
            └── mixamorigRightToeBase
```

### Character Creator 4 Bones (CC_Base_Xxx)
```
CC_Base_BoneRoot
└── CC_Base_Hip
    ├── CC_Base_Waist
    │   ├── CC_Base_Spine01
    │   │   ├── CC_Base_Spine02
    │   │   │   ├── CC_Base_NeckTwist01
    │   │   │   │   └── CC_Base_NeckTwist02
    │   │   │   │       └── CC_Base_Head
    │   │   │   ├── CC_Base_L_Clavicle
    │   │   │   │   └── CC_Base_L_Upperarm
    │   │   │   │       ├── CC_Base_L_UpperarmTwist01
    │   │   │   │       └── CC_Base_L_Forearm
    │   │   │   │           └── CC_Base_L_Hand
    │   │   │   └── CC_Base_R_Clavicle
    │   │   │       └── CC_Base_R_Upperarm
    │   │   │           └── CC_Base_R_Forearm
    │   │   │               └── CC_Base_R_Hand
    ├── CC_Base_L_Thigh
    │   └── CC_Base_L_Calf
    │       └── CC_Base_L_Foot
    │           └── CC_Base_L_ToeBase
    └── CC_Base_R_Thigh
        └── CC_Base_R_Calf
            └── CC_Base_R_Foot
                └── CC_Base_R_ToeBase
```

### VRM Humanoid Bones (standardized)
```
hips
├── spine
│   ├── chest
│   │   ├── upperChest (optional)
│   │   │   ├── neck
│   │   │   │   └── head
│   │   │   ├── leftShoulder
│   │   │   │   └── leftUpperArm
│   │   │   │       └── leftLowerArm
│   │   │   │           └── leftHand
│   │   │   └── rightShoulder
│   │   │       └── rightUpperArm
│   │   │           └── rightLowerArm
│   │   │               └── rightHand
├── leftUpperLeg
│   └── leftLowerLeg
│       └── leftFoot
│           └── leftToes
└── rightUpperLeg
    └── rightLowerLeg
        └── rightFoot
            └── rightToes
```

---

## Bone Mapping Tables

### Mixamo → VRM
| Mixamo | VRM |
|--------|-----|
| mixamorigHips | hips |
| mixamorigSpine | spine |
| mixamorigSpine1 | chest |
| mixamorigSpine2 | upperChest |
| mixamorigNeck | neck |
| mixamorigHead | head |
| mixamorigLeftShoulder | leftShoulder |
| mixamorigLeftArm | leftUpperArm |
| mixamorigLeftForeArm | leftLowerArm |
| mixamorigLeftHand | leftHand |
| mixamorigRightShoulder | rightShoulder |
| mixamorigRightArm | rightUpperArm |
| mixamorigRightForeArm | rightLowerArm |
| mixamorigRightHand | rightHand |
| mixamorigLeftUpLeg | leftUpperLeg |
| mixamorigLeftLeg | leftLowerLeg |
| mixamorigLeftFoot | leftFoot |
| mixamorigLeftToeBase | leftToes |
| mixamorigRightUpLeg | rightUpperLeg |
| mixamorigRightLeg | rightLowerLeg |
| mixamorigRightFoot | rightFoot |
| mixamorigRightToeBase | rightToes |

### Mixamo → CC4
| Mixamo | CC4 |
|--------|-----|
| mixamorigHips | CC_Base_Hip |
| mixamorigSpine | CC_Base_Waist |
| mixamorigSpine1 | CC_Base_Spine01 |
| mixamorigSpine2 | CC_Base_Spine02 |
| mixamorigNeck | CC_Base_NeckTwist01 |
| mixamorigHead | CC_Base_Head |
| mixamorigLeftShoulder | CC_Base_L_Clavicle |
| mixamorigLeftArm | CC_Base_L_Upperarm |
| mixamorigLeftForeArm | CC_Base_L_Forearm |
| mixamorigLeftHand | CC_Base_L_Hand |
| mixamorigRightShoulder | CC_Base_R_Clavicle |
| mixamorigRightArm | CC_Base_R_Upperarm |
| mixamorigRightForeArm | CC_Base_R_Forearm |
| mixamorigRightHand | CC_Base_R_Hand |
| mixamorigLeftUpLeg | CC_Base_L_Thigh |
| mixamorigLeftLeg | CC_Base_L_Calf |
| mixamorigLeftFoot | CC_Base_L_Foot |
| mixamorigLeftToeBase | CC_Base_L_ToeBase |
| mixamorigRightUpLeg | CC_Base_R_Thigh |
| mixamorigRightLeg | CC_Base_R_Calf |
| mixamorigRightFoot | CC_Base_R_Foot |
| mixamorigRightToeBase | CC_Base_R_ToeBase |

### CC4 → VRM
| CC4 | VRM |
|-----|-----|
| CC_Base_Hip | hips |
| CC_Base_Waist | spine |
| CC_Base_Spine01 | chest |
| CC_Base_Spine02 | upperChest |
| CC_Base_NeckTwist01 | neck |
| CC_Base_Head | head |
| CC_Base_L_Clavicle | leftShoulder |
| CC_Base_L_Upperarm | leftUpperArm |
| CC_Base_L_Forearm | leftLowerArm |
| CC_Base_L_Hand | leftHand |
| CC_Base_R_Clavicle | rightShoulder |
| CC_Base_R_Upperarm | rightUpperArm |
| CC_Base_R_Forearm | rightLowerArm |
| CC_Base_R_Hand | rightHand |
| CC_Base_L_Thigh | leftUpperLeg |
| CC_Base_L_Calf | leftLowerLeg |
| CC_Base_L_Foot | leftFoot |
| CC_Base_L_ToeBase | leftToes |
| CC_Base_R_Thigh | rightUpperLeg |
| CC_Base_R_Calf | rightLowerLeg |
| CC_Base_R_Foot | rightFoot |
| CC_Base_R_ToeBase | rightToes |

---

## Libraries for Retargeting in Three.js

### 1. vrm-mixamo-retarget (Recommended for VRM)
**npm:** `npm install vrm-mixamo-retarget`
**GitHub:** https://github.com/saori-eth/vrm-mixamo-retargeter

```typescript
import { retargetAnimation } from 'vrm-mixamo-retarget';

// Load Mixamo FBX and VRM model
const fbxAsset = await fbxLoader.loadAsync('mixamo/Standing Idle.fbx');
const gltf = await gltfLoader.loadAsync('avatar.vrm');
const vrm = gltf.userData.vrm;

// Retarget - handles bone mapping automatically
const clip = retargetAnimation(fbxAsset, vrm);
if (clip) {
    const mixer = new THREE.AnimationMixer(vrm.scene);
    mixer.clipAction(clip).play();
}
```

### 2. retargeting-threejs (Multi-rig support)
**GitHub:** https://github.com/upf-gti/retargeting-threejs

```typescript
import { AnimationRetargeting, BindPoseModes } from 'retargeting-threejs';

const retargeting = new AnimationRetargeting(sourceSkeleton, targetSkeleton, {
    srcPoseMode: BindPoseModes.DEFAULT,
    trgPoseMode: BindPoseModes.CURRENT,
    boneNameMap: {
        'mixamorigHips': 'CC_Base_Hip',
        'mixamorigSpine': 'CC_Base_Waist',
        // ... full mapping
    }
});

const retargetedClip = retargeting.retargetAnimation(sourceAnimation);
```

### 3. Three.js SkeletonUtils (Built-in, limited)
```typescript
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

// Note: Works best with matching skeleton structures
const retargetedClip = SkeletonUtils.retargetClip(
    targetSkinnedMesh,
    sourceSkinnedMesh,
    sourceAnimationClip,
    { hip: 'Hips', spine: 'Spine' }  // bone mapping
);
```

---

## Implementation Strategy

### For VRM Models
1. Use `vrm-mixamo-retarget` library - it handles Mixamo→VRM automatically
2. Load animation FBX with FBXLoader
3. Call `retargetAnimation(fbx, vrm)`
4. Play with AnimationMixer

### For CC4 Models
1. **Best option:** Use CC4-native animations (no retargeting needed)
2. **If using Mixamo:** Use `retargeting-threejs` with Mixamo→CC4 bone map
3. Ensure bind poses match (T-pose for both)

### For Mixed Workflows
1. Detect model type by bone names (CC_Base_ vs mixamorig vs VRM humanoid)
2. Load appropriate animation source
3. Apply retargeting only when source/target differ

---

## Known Issues

1. **Proportions:** Different body proportions can cause foot sliding or arm clipping
2. **Bind Pose:** Both skeletons must have matching bind poses (usually T-pose)
3. **Fingers:** Finger bone counts may differ - handle missing bones gracefully
4. **Twist Bones:** CC4 has twist bones (UpperarmTwist01) that Mixamo doesn't - ignore or blend

---

## Sources

- [vrm-mixamo-retarget (GitHub)](https://github.com/saori-eth/vrm-mixamo-retargeter)
- [retargeting-threejs (GitHub)](https://github.com/upf-gti/retargeting-threejs)
- [Three.js SkeletonUtils Docs](https://threejs.org/docs/examples/en/utils/SkeletonUtils.html)
- [pixiv/three-vrm Discussions](https://github.com/pixiv/three-vrm/discussions/1088)
- [CC4 Bone List Manual](https://manual.reallusion.com/Character-Creator-4/Content/ENU/4.0/04_Introducing_the_User_Interface/Bone-List.htm)
