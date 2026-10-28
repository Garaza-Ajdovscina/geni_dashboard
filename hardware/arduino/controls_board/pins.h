#ifndef PINS_H
#define PINS_H

// Switches board: all 4 pots + toggle switches + 3-way battery.

#define POT_NUCLEAR A0
#define POT_HYDRO A1
#define POT_GAS A2
#define POT_BATTERY_FLOW A3

#define TOGGLE_HYDRO 2       // physical label "Sončna"
#define TOGGLE_WIND 3
#define TOGGLE_NUCLEAR 4
#define BATTERY_BIT0 5       // 3-way battery (polnjenje/praznjenje/izklop)
#define BATTERY_BIT1 6
#define TOGGLE_SOLAR 7       // physical praznjenje/izklop
#define TOGGLE_GAS 8         // physical polnjenje/izklop
#define PIN_FULLSCREEN 13    // momentary — browser fullscreen (D13)

#define POT_SAMPLES 20
#define FRAME_INTERVAL_MS 100

#endif
