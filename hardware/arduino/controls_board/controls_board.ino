#include "pins.h"

const int TOGGLE_PINS[5] = {
  TOGGLE_SOLAR, TOGGLE_WIND, TOGGLE_NUCLEAR, TOGGLE_HYDRO, TOGGLE_GAS
};
const int POT_PINS[4] = { POT_NUCLEAR, POT_HYDRO, POT_GAS, POT_BATTERY_FLOW };

int readSmoothPot(int pin) {
  long total = 0;
  for (int i = 0; i < POT_SAMPLES; i++) {
    total += analogRead(pin);
    delay(2);
  }
  return total / POT_SAMPLES;
}

bool toggleOn(int pin) {
  return digitalRead(pin) == LOW;
}

bool fullscreenPressed() {
  return digitalRead(PIN_FULLSCREEN) == LOW;
}

const char* batteryMode() {
  bool b0 = digitalRead(BATTERY_BIT0) == LOW;
  bool b1 = digitalRead(BATTERY_BIT1) == LOW;
  if (!b0 && b1) return "charge";
  if (b0 && !b1) return "discharge";
  return "off";
}

void emitControlsFrame() {
  Serial.print(F("C,"));
  for (int i = 0; i < 4; i++) {
    Serial.print(readSmoothPot(POT_PINS[i]));
    Serial.print(',');
  }
  for (int i = 0; i < 5; i++) {
    Serial.print(toggleOn(TOGGLE_PINS[i]) ? 1 : 0);
    Serial.print(',');
  }
  Serial.println(batteryMode());
}

void emitSwitchesSnap() {
  bool fs = fullscreenPressed();
  Serial.print(F("S,snap,"));
  Serial.println(fs ? 1 : 0);
}

void setup() {
  Serial.begin(115200);
  for (int i = 0; i < 5; i++) {
    pinMode(TOGGLE_PINS[i], INPUT_PULLUP);
  }
  pinMode(BATTERY_BIT0, INPUT_PULLUP);
  pinMode(BATTERY_BIT1, INPUT_PULLUP);
  pinMode(PIN_FULLSCREEN, INPUT_PULLUP);
  delay(1000);
  Serial.println(F("GENI,1,controls"));
}

void loop() {
  emitControlsFrame();
  emitSwitchesSnap();
  delay(FRAME_INTERVAL_MS);
}
