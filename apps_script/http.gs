function fetchJsonWithEtag(url, etag) {
  const headers = {
    'User-Agent': 'ChessSheets/1.0 (AppsScript)',
    'Accept': 'application/json'
  };
  if (etag) headers['If-None-Match'] = etag;
  const options = {
    method: 'get',
    muteHttpExceptions: true,
    followRedirects: true,
    headers: headers
  };
  const resp = UrlFetchApp.fetch(url, options);
  const code = resp.getResponseCode();
  const hdrs = resp.getAllHeaders();
  const newEtag = hdrs['ETag'] || hdrs['Etag'] || hdrs['etag'] || null;
  const lastModified = hdrs['Last-Modified'] || hdrs['last-modified'] || null;
  if (code === 304) {
    return { code: code, status: 'not_modified', etag: etag || newEtag, lastModified: lastModified };
  }
  if (code >= 200 && code < 300) {
    const text = resp.getContentText();
    const json = text ? JSON.parse(text) : null;
    return { code: code, status: 'ok', json: json, etag: newEtag, lastModified: lastModified };
  }
  return { code: code, status: 'error', error: 'HTTP_' + code, etag: newEtag, lastModified: lastModified };
}

