let ring = neopixel.create(DigitalPin.P1, 8, NeoPixelMode.RGBW)
basic.forever(function () {
    for (let index = 0; index <= 8; index++) {
        ring.setPixelColor(index, neopixel.colors(NeoPixelColors.Red))
        ring.show()
        ring.setPixelColor(index, neopixel.rgb(16, 16, 16))
        ring.show()
    }
})
