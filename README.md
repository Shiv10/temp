Here’s a **README-style PRD** for the *Zen Sand Garden* game. You can drop this directly into your repo (e.g., `README.md`) so both your MBA teammates and you as the engineer are aligned.

---

# Zen Sand Garden – PRD (Product Requirements Document)

## 📌 Overview

The **Zen Sand Garden** is a browser-based, interactive relaxation game designed to provide users with a sense of calm and mindfulness.
It will be part of the **Quiet Corners** website, which offers anxiety-relief tools and calming experiences for students and individuals in stressful environments.

The game replicates the soothing act of raking sand in a Japanese Zen garden, giving users a creative yet meditative outlet with no winning or losing conditions.

---

## 🎯 Objectives

* Provide an **interactive mindfulness tool** that reduces stress.
* Create a **simple and intuitive experience** — anyone can use it instantly.
* Align the design with *Quiet Corners’* calming aesthetics.
* Work across desktop and mobile browsers with **minimal performance overhead**.

---

## 👥 Target Audience

* **Primary**: Students managing stress or anxiety.
* **Secondary**: General users looking for a short, calming digital break.
* **Accessibility**: Simple controls (tap/drag), low visual stimulation, no rapid animations.

---

## 🌱 Game Concept

**Theme**:
A minimalist Zen sand garden where users rake patterns in the sand and place stones or plants to create calming designs.

**Mechanics**:

* Users **click/drag** (or tap/drag on mobile) to rake lines in the sand.
* Users can **place objects** (stones, bonsai trees, lanterns) on the garden.
* Option to **reset** the garden to a blank sand state.
* No scores, no levels, just endless creation and relaxation.

---

## 🛠️ Core Features

### **Gameplay**

* **Raking Tool**: Draws smooth grooves in the sand where the user drags.
* **Object Placement**: Small selection of calming objects to drop into the garden.
* **Undo / Reset**: Clear last action or reset entire garden.

### **Visuals**

* Background: Soft beige/cream sand texture.
* Objects: Smoothly shaded stones, bonsai trees, lanterns.
* Raking: Gentle grooves with subtle shadows for depth.

### **Audio**

* Ambient garden sounds (wind, bamboo chimes, soft water trickle).
* Gentle sound when placing an object (stone drop, plant rustle).
* Toggle button for sound on/off.

### **Controls**

* Desktop: Mouse drag to rake, click to place objects.
* Mobile: Finger drag to rake, tap to place objects.
* UI:

  * Tool selector (Rake / Object Placement).
  * Object palette (stones, plants, lanterns).
  * Undo / Reset buttons.

---

## ⚙️ Technical Requirements

* **Platform**: Web-based (HTML5 Canvas + JavaScript).
* **Devices**: Mobile-first responsive design, works on desktop.
* **Performance**: Maintain smooth interactions (>50 FPS).
* **Accessibility**:

  * Avoid sharp colors or flashing.
  * Simple, intuitive gestures.

---

## 📊 Success Metrics

* Average session length (target: 3–7 minutes).
* Positive user feedback in pilot testing.
* Smooth raking & placement without lag on mobile browsers.

---

## 🚫 Non-Goals

* No competitive elements (scores, timers).
* No forced login or account system.
* No monetization.

---

## 🌟 Future Enhancements

* Save & share garden designs (image export).
* Expanded object palette (pagoda, koi pond, lantern styles).
* Seasonal sand/stone textures.
* Procedural “wind” effect that slowly shifts sand over time.

---

## 📅 Suggested Timeline

| Phase        | Task                                     | Duration |
| ------------ | ---------------------------------------- | -------- |
| **Week 1**   | Finalize art style + calming sounds      | 1 week   |
| **Week 2–3** | Implement raking + sand reset system     | 2 weeks  |
| **Week 4**   | Add object placement & basic UI          | 1 week   |
| **Week 5**   | Integrate into Quiet Corners site + test | 1 week   |

---

## ✅ Deliverables (MVP)

* A playable Zen Garden with:

  * Raking tool.
  * At least 2 placeable objects (stone + plant).
  * Ambient background sound.
  * Undo + Reset functionality.

---
