# Electron build resources

Files in this folder are picked up by **electron-builder** when packaging the
desktop app. They are not bundled into the regular web build.

## App icon (optional, but recommended)

Drop a Windows icon here named exactly:

```
build/icon.ico
```

Recommended:

- 256 × 256 pixels, multi-resolution `.ico` (electron-builder will embed it
  into the produced `.exe`).
- Tools like https://icoconvert.com or `magick` (ImageMagick) can convert a
  PNG to a proper multi-resolution `.ico`.

If `build/icon.ico` is missing, the packaged app will fall back to the
default Electron icon. The build will still succeed.
