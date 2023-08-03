
import express from "express";

const port = 4000;
const app = express();

const static_dirs = [
    "client",
    "shared"
]

for(const dir of static_dirs) {
    app.use(`/${dir}`, express.static(`./src/${dir}`));
}


app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
        <link rel="stylesheet" href="/bundle/client/main.tsx.css">
        <script type="module">
            import main from "/bundle/client/main.tsx";
            main()
        </script>
        <body>
            <div id="container">
                <h4>lazybun example</h4>
                <div id="root"></div>
            </div>
        </body>
    </html>
  `);
});

async function get_bundle({entry}) {
    const bundle_result = await Bun.build({
        entrypoints: [entry],
        format: "esm",
        // sourcemap: "inline",
        minify: {
            whitespace: true,
            identifiers: true,
            syntax: true,
        },
    });

    return bundle_result;
}

type BundleType = "js" | "css" | "map";

async function get_bundle_file({entry, type}: {entry: string, type: BundleType}) {
    const bundle_result = await get_bundle({entry});

    let relevant_bundle, bundle_text;
    if(type == "js") {
        relevant_bundle = bundle_result.outputs.filter(o => o.kind == "entry-point")[0];
        bundle_text = await relevant_bundle.text();
    } else if(type == "css") {
        let relevant_bundles = bundle_result.outputs.filter(o => o.kind == "asset" && o.path.endsWith(".css"));
        bundle_text = await Promise.all(relevant_bundles.map(b => b.text())).then(texts => texts.join("\n"));
    } else if(type == "map") {
        relevant_bundle = bundle_result.outputs.filter(o => o.kind == "asset" && o.path.endsWith(".js.map"))[0];
        bundle_text = await relevant_bundle.text();
    }
    return bundle_text;
}

const bundle_cache = {};
app.get(`/bundle/:folder(${static_dirs.join("|")})/:file`, async (req, res) => {
    const { folder, file } = req.params;
    let entry = `src/${folder}/${file}`;

    const file_extension = file.split(".").slice(-1)[0];
    let bundle_text: string;

    if(["ts", "tsx", "js", "jsx"].includes(file_extension)) {
        res.setHeader("Content-Type", "application/javascript");
        if(bundle_cache[entry]) {
            bundle_text = bundle_cache[entry];
        } else {
            bundle_text = await get_bundle_file({entry, type: "js"});
            bundle_cache[entry] = bundle_text;
        }
    } else if(file_extension == "css") {
        res.setHeader("Content-Type", "text/css");
        if(bundle_cache[entry]) {
            bundle_text = bundle_cache[entry];
        } else {
            let js_entry = entry.replace(/\.css$/, "");
            bundle_text = await get_bundle_file({entry: js_entry, type: "css"});
            bundle_cache[entry] = bundle_text;
        }
    }


    res.send(bundle_text);
});



app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});