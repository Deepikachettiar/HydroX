# HydroX – Smart Apartment Water Audit System

HydroX is an IoT-based smart water monitoring and predictive leak detection system designed for apartment buildings.  
The system tracks water usage across multiple flats using ESP32 and flow sensors, stores the data in the cloud, and provides intelligent alerts for abnormal water consumption and potential leaks.

This project combines **IoT hardware, cloud backend, and a web dashboard** to create a real-time water intelligence platform.

---

# Problem

In most apartments:

- Water consumption is not tracked per flat
- Water leaks go unnoticed for long periods
- Residents have no visibility into their water usage
- Building management cannot identify abnormal consumption patterns

This leads to **water wastage, unfair billing, and infrastructure damage**.

---

# Solution

HydroX provides a **real-time smart water monitoring system** that:

- Tracks water flow from multiple flats
- Sends real-time usage data to the cloud
- Displays usage analytics through a dashboard
- Detects continuous flow patterns that indicate leaks
- Enables future predictive behavioral analytics

---

# Key Features

### Real-Time Water Monitoring
ESP32 reads pulses from water flow sensors and converts them into water usage values.

### Multi-Flat Tracking
Each sensor corresponds to a separate apartment water line.

### Live Dashboard
Water usage is visualized on a web dashboard.

### Leak Detection
Continuous water flow beyond a defined threshold triggers a leak alert.

### Cloud Data Storage
Historical water usage is stored in Firebase for analytics and learning.

### Behavior-Based Detection (Future Scope)
The system can learn water consumption patterns and detect abnormal usage.

---

# System Architecture

```
Water Flow Sensor
      │
      ▼
ESP32 Microcontroller
      │
      ▼
Blynk Cloud
      │
      ▼
Backend Server
      │
      ▼
Firebase Database
      │
      ▼
Frontend Dashboard
```

---

# Hardware Components

- ESP32 Dev Module
- YF-S201 Water Flow Sensors
- Breadboard and jumper wires
- 5V power supply
- Water pipe adapters

---

# Software Stack

### Hardware / IoT
- Arduino IDE
- ESP32 Firmware
- Blynk IoT Platform

### Backend
- Node.js
- Express.js
- Firebase

### Frontend
- Web Dashboard
- REST API communication
- Real-time usage display

---

# Repository Structure

```
HydroX
│
├── hardware
│   └── smart_water_usage_detector.ino
│
├── HydroX
│   └── frontend
|   └── backend
│
├── README.md
└── .gitignore
```

---

# How It Works

1. Water flows through the sensor.
2. The sensor generates pulses proportional to flow.
3. ESP32 counts pulses using hardware interrupts.
4. Flow rate is calculated and sent to the cloud.
5. Backend stores usage data in Firebase.
6. The dashboard displays real-time and historical water usage.
7. Leak detection logic triggers alerts when abnormal flow patterns occur.

---

# Leak Detection Logic

A leak is detected when:

- Continuous water flow persists beyond a defined duration
- Flow rate exceeds safe baseline levels
- Usage occurs during unusual hours (future feature)

This helps detect:

- Open taps
- Pipe leaks
- Continuous water wastage

---

# Future Improvements

- Adaptive behavioral learning
- Predictive leak detection
- Apartment water consumption analytics
- Automated water shutoff integration
- Smart building management integration

---

# Demo Flow

1. Water flows through the sensor
2. ESP32 calculates flow rate
3. Data is sent to Blynk and backend
4. Backend stores and processes usage data
5. Dashboard displays live water usage
6. Alerts trigger when abnormal usage occurs

---

# Installation

## ESP32 Firmware

1. Open the Arduino file in the `hardware` folder.
2. Install required libraries:
   - Blynk
   - WiFi
3. Add your credentials:

```cpp
#define BLYNK_AUTH_TOKEN "YOUR_TOKEN"
char ssid[] = "YOUR_WIFI";
char pass[] = "YOUR_PASSWORD";

Upload the firmware to the ESP32.

Backend Setup
cd backend
npm install
node server.js

Configure Firebase credentials before running.

Frontend Setup
cd frontend
npm install
npm start
Security Note

Sensitive credentials such as:
WiFi passwords
Blynk tokens
Firebase keys
are not included in this repository.
Use environment variables for configuration.
