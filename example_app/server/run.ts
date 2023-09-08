
import express from "express";
import lazybuns from "../../index";

const port = 4001;
const app = express();

lazybuns(app, {
  dirs: {
    "client": "example_app/client",
  }
});

app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
        <link rel="stylesheet" href="/bundle:/client/main.tsx.css">
        <script type="module">
            import main from "/bundle:/client/main.tsx";
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


app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});