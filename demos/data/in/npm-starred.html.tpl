<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>npm most starred packages</title>
  </head>
  <body>
    <h1>npm most starred packages ({{ results.packages.length }})</h1>
    <ol>
        {{ #results }}
        {{ #packages }}
        <li>
          <p><strong>{{ name }} v{{ version }}</strong> by {{ author }}</p>
          <p><em>{{ description }}</em></p>
        </li>
        {{ /packages }}
        {{ /results }}
    </ol>
  </body>
</html>
