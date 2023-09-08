
import * as esbuild from 'esbuild';

export default function lazybuns(app, {
    dirs,
    prefix="bundle:"
} : {
    dirs: Record<string, string>,
    prefix?: string
}) {

    type Bundle = {
        js: string,
        css: string,
        js_map: string,
        css_map: string,
        timestamp: number,
    }

    async function get_bundle_esbuild({entry}) {
        let result = await esbuild.build({
            entryPoints: [entry],
            bundle: true,
            outfile: entry,
            write: false,
            minify: true,
            sourcemap: true,
            target: 'es2020',
            format: 'esm',
            plugins: []
        })

        const { outputFiles } = result

        const bundle = { js: '', css: '', js_map: '', css_map: '', timestamp: Date.now() } as Bundle;
        
        for(const file of outputFiles) {
            const file_path = file.path;

            const file_extension = file_path.split(".").slice(-1)[0];
            if(["ts", "tsx", "js", "jsx"].includes(file_extension)) {
                bundle.js += file.text;
            } else if(file_path.endsWith(".css.map")) {
                bundle.css_map += file.text;
            } else if(file_path.endsWith(".css")) {
                bundle.css += file.text;
            } else if(file_path.endsWith(".map")) {
                bundle.js_map += file.text;
            }

        }

        return bundle;
    }


    const bundle_cache = {};
    let busy_bundling = false;

    const client_dirs = Object.keys(dirs);

    app.get(`/${prefix}/:folder(${client_dirs.join("|")})/:file`, async (req, res) => {
        const { folder, file } = req.params;
        let req_entry = `${dirs[folder]}/${file}`;

        const file_extension = file.split(".").slice(-1)[0];
        let bundle_text;

        const use_cache = true;

        let entry = req_entry.replace(/\.css\.map$/, "").replace(/\.css$/, "").replace(/\.map$/, "");

        // esbuild has a bug of misrenaming main.ts.css.map to main.css.map
        if(!entry.endsWith(".js") && !entry.endsWith(".jsx") && !entry.endsWith(".ts") && !entry.endsWith(".tsx")) {
            // check if file exists with extensions [.js, .jsx, .ts, .tsx]
            for(const ext of [".js", ".jsx", ".ts", ".tsx"]) {
                if(bundle_cache[entry+ext]) {
                    entry += ext;
                    break;
                }
            }
        }
        let bundle;

        if(use_cache && bundle_cache[entry] && bundle_cache[entry].timestamp > Date.now() - 1000*3) {
            bundle = bundle_cache[entry];
        } else {
            busy_bundling = true;
            bundle = await get_bundle_esbuild({entry});
            bundle_cache[entry] = bundle;
            busy_bundling = false;
        }

        if(["ts", "tsx", "js", "jsx"].includes(file_extension)) {
            res.setHeader("Content-Type", "application/javascript");
            bundle_text = bundle.js;
        } else if(file_extension == "css") {
            res.setHeader("Content-Type", "text/css");
            bundle_text = bundle.css;
        } else if(file_extension == "map") {
            res.setHeader("Content-Type", "application/json");
            if(req_entry.endsWith(".css.map")) {
                bundle_text = bundle.css_map;
            } else {
                bundle_text = bundle.js_map;
            }
        } else {
            throw new Error(`Unknown file extension ${file_extension}`);
        }


        res.send(bundle_text);
    });

    return app;
}
