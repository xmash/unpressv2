// Generates a tiny synthetic .wpress fixture for testing the recover UI fast,
// without needing a real multi-hundred-MB backup. Writes public/sample.wpress.
import fs from "node:fs";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

const sql = `
CREATE TABLE \`wp_options\` ( id int );
INSERT INTO \`wp_options\` VALUES (1,'blogname','Demo Recovered Site','yes'),(2,'blogdescription','A friendly little demo backup','yes'),(3,'siteurl','https://demo.example','yes');
CREATE TABLE \`wp_posts\` ( id int );
INSERT INTO \`wp_posts\` VALUES (2,1,'2024-01-01 10:00:00','2024-01-01 10:00:00','<h2>Welcome</h2><p>We build delightful things for the modern web.</p><p><img src="https://demo.example/wp-content/uploads/2024/01/hero-1200x600.png" /></p>','Home','','publish','closed','closed','','home','','','2024-01-01 10:00:00','2024-01-01 10:00:00','',0,'https://demo.example/?page_id=2',0,'page','',0),(3,1,'2024-01-02 10:00:00','2024-01-02 10:00:00','<p>About our team and our mission to make the web friendlier.</p>','About','','publish','closed','closed','','about','','','2024-01-02 10:00:00','2024-01-02 10:00:00','',0,'https://demo.example/?page_id=3',1,'page','',0),(4,1,'2024-01-03 10:00:00','2024-01-03 10:00:00','<p>Everything we offer, in one place.</p>','Services','','publish','closed','closed','','services','','','2024-01-03 10:00:00','2024-01-03 10:00:00','',0,'https://demo.example/?page_id=4',2,'page','',0),(5,1,'2024-01-04 10:00:00','2024-01-04 10:00:00','<p>Reach out any time. We would love to hear from you.</p>','Contact','','publish','closed','closed','','contact','','','2024-01-04 10:00:00','2024-01-04 10:00:00','',0,'https://demo.example/?page_id=5',3,'page','',0),(6,1,'2024-01-05 10:00:00','2024-01-05 10:00:00','<p>The friendly humans behind the work.</p>','Our Team','','publish','closed','closed','','our-team','','','2024-01-05 10:00:00','2024-01-05 10:00:00','',3,'https://demo.example/?page_id=6',0,'page','',0),(10,1,'2024-02-01 09:00:00','2024-02-01 09:00:00','<p>We are thrilled to announce our public launch today.</p><p><img src="https://demo.example/wp-content/uploads/2024/01/launch-300x200.png" /></p>','Hello World, We Launched','','publish','open','open','','hello-world','','','2024-02-01 09:00:00','2024-02-01 09:00:00','',0,'https://demo.example/?p=10',0,'post','',0),(11,1,'2024-02-08 09:00:00','2024-02-08 09:00:00','<p>A few tips and tricks to get the most out of our product.</p>','Tips and Tricks for Power Users','','publish','open','open','','tips-and-tricks','','','2024-02-08 09:00:00','2024-02-08 09:00:00','',0,'https://demo.example/?p=11',0,'post','',0),(12,1,'2024-02-15 09:00:00','2024-02-15 09:00:00','<p>This one is still a work in progress.</p>','An Unfinished Draft','','draft','open','open','','unfinished-draft','','','2024-02-15 09:00:00','2024-02-15 09:00:00','',0,'https://demo.example/?p=12',0,'post','',0);
`;

const files = [
  { name: "database.sql", prefix: ".", data: Buffer.from(sql, "utf8") },
  { name: "hero.png", prefix: "uploads/2024/01", data: PNG },
  { name: "launch.png", prefix: "uploads/2024/01", data: PNG },
  { name: "about-photo.png", prefix: "uploads/2024/01", data: PNG },
];

function header(name, prefix, size) {
  const buf = Buffer.alloc(4377, 0);
  Buffer.from(name).copy(buf, 0);
  Buffer.from(String(size)).copy(buf, 255);
  Buffer.from(String(Math.floor(Date.now() / 1000))).copy(buf, 269);
  Buffer.from(prefix).copy(buf, 281);
  return buf;
}

const chunks = [];
for (const f of files) {
  chunks.push(header(f.name, f.prefix, f.data.length));
  chunks.push(f.data);
}
chunks.push(Buffer.alloc(4377, 0)); // EOF

fs.mkdirSync("public", { recursive: true });
fs.writeFileSync("public/sample.wpress", Buffer.concat(chunks));
console.log("wrote public/sample.wpress", fs.statSync("public/sample.wpress").size, "bytes");
