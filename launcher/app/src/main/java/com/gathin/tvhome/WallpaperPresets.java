package com.gathin.tvhome;

import android.content.Context;
import android.content.res.AssetManager;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;

/**
 * Copies bundled preset wallpapers from {@code assets/wallpapers/} into the launcher's
 * {@code wallpapers/} directory when missing, so they appear in Launcher Settings -> Wallpaper.
 */
final class WallpaperPresets {

    private static final String ASSET_DIR = "wallpapers";
    private static volatile boolean ensured;

    private WallpaperPresets() {
    }

    static void ensureInstalled(Context ctx) {
        if (ensured || ctx == null) return;
        File dir = Config.dir(ctx);
        if (dir == null) return;
        File wallpapersDir = new File(dir, ASSET_DIR);
        if (!wallpapersDir.exists() && !wallpapersDir.mkdirs()) return;

        AssetManager assets = ctx.getAssets();
        String[] files;
        try {
            files = assets.list(ASSET_DIR);
        } catch (IOException ignored) {
            return;
        }
        if (files == null) return;

        byte[] buf = new byte[8192];
        for (String name : files) {
            if (name == null || name.isEmpty()) continue;
            File out = new File(wallpapersDir, name);
            if (out.isFile() && out.length() > 0) continue;
            try (InputStream in = assets.open(ASSET_DIR + "/" + name);
                 FileOutputStream fos = new FileOutputStream(out)) {
                int n;
                while ((n = in.read(buf)) > 0) {
                    fos.write(buf, 0, n);
                }
            } catch (IOException ignored) {
            }
        }
        ensured = true;
    }
}
