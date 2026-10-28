#include "pins.h"

struct ButtonDef {
  uint8_t pin;
  const char* name;
};

const ButtonDef BUTTONS[] = {
  { 9, "UP" },
  { 7, "DOWN" },
  { 4, "LEFT" },
  { 10, "RIGHT" },
  { 8, "ESC" },
  { 5, "ENTER" },
  { 6, "BACKSPACE" },
  { 3, "SPEED_LEFT" },
  { 2, "SPEED_RIGHT" },
};

const int BUTTON_COUNT = sizeof(BUTTONS) / sizeof(BUTTONS[0]);

unsigned long lastSnapMs = 0;

bool readPressed(uint8_t pin) {
  int v = digitalRead(pin);
#if BUTTONS_ACTIVE_LOW
  return v == LOW;
#else
  return v == HIGH;
#endif
}

void emitSnap() {
  Serial.print(F("P,snap"));
  for (int i = 0; i < BUTTON_COUNT; i++) {
    Serial.print(',');
    Serial.print(readPressed(BUTTONS[i].pin) ? 1 : 0);
  }
  Serial.println();
}

void setup() {
  Serial.begin(115200);
  for (int i = 0; i < BUTTON_COUNT; i++) {
#if BUTTONS_ACTIVE_LOW
    pinMode(BUTTONS[i].pin, INPUT_PULLUP);
#else
    pinMode(BUTTONS[i].pin, INPUT);
#endif
  }
  delay(1000);
  Serial.println(F("GENI,1,panel"));
}

void loop() {
  if (millis() - lastSnapMs >= SNAP_INTERVAL_MS) {
    lastSnapMs = millis();
    emitSnap();
  }
}
