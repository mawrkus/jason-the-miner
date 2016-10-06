<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>npm most starred packages</title>
  </head>
  <body>
    <h1>npm most starred packages ({{ results.length }})</h1>
    <ol>
        {{ #results }}
        <li>
          <p><strong>{{ name }} v{{ version }}</strong> by {{ author }}</p>
          <p><em>{{ description }}</em></p>
        </li>
        {{ /results }}
    </ol>
  </body>
</html>
