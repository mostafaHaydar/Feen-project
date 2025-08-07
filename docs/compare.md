
# Face++ Compare API (v3.0)

## Overview
Compare two faces and determine whether they are from the same person. You can upload image files or use `face_token`s. For images, the largest detected face (by bounding box) will be used. Use the Detect API to obtain face tokens.

## Image Requirements
- **Format:** JPG (JPEG), PNG  
- **Size:** 48x48 to 4096x4096 pixels  
- **File size:** ≤ 2MB  
- **Minimum face size:** Bounding box side ≥ 150 pixels  

> **Changelog:**  
> March 28, 2017 – Added support for Base64 encoded images.

## Request URL
```
POST https://api-us.faceplusplus.com/facepp/v3/compare
```

## Authentication
All API Keys can access this API.

## Request Parameters

| Name             | Type   | Description                                   | Required |
|------------------|--------|-----------------------------------------------|----------|
| `api_key`        | String | Your API Key                                  | Yes      |
| `api_secret`     | String | Your API Secret                               | Yes      |
| `face_token1`    | String | First face ID (highest priority)              | Optional |
| `image_url1`     | String | URL of the first image                        | Optional |
| `image_file1`    | File   | Binary data of first image (highest priority) | Optional |
| `image_base64_1` | String | Base64 encoded first image                    | Optional |
| `face_token2`    | String | Second face ID                                | Optional |
| `image_url2`     | String | URL of the second image                       | Optional |
| `image_file2`    | File   | Binary data of second image                   | Optional |
| `image_base64_2` | String | Base64 encoded second image                   | Optional |

### Precedence for each image:
1. `image_file`
2. `image_base64`
3. `image_url`

## Response Fields

| Field         | Type    | Description |
|---------------|---------|-------------|
| `request_id`  | String  | Unique ID for the request |
| `confidence`  | Float   | Similarity score (0-100) |
| `thresholds`  | Object  | Thresholds for 1e-3, 1e-4, 1e-5 error rates |
| `image_id1`   | String  | ID of the first image |
| `image_id2`   | String  | ID of the second image |
| `faces1`      | Array   | Detected faces in the first image |
| `faces2`      | Array   | Detected faces in the second image |
| `time_used`   | Int     | Time taken (ms) |
| `error_message` | String | Error info (if failed) |

## Face Object Fields

| Field           | Type   | Description |
|------------------|--------|-------------|
| `face_token`     | String | Unique face ID |
| `face_rectangle` | Object | Face bounding box: top, left, width, height |

## Sample Success Response
```json
{
  "time_used": 473,
  "confidence": 96.46,
  "thresholds": {
    "1e-3": 65.3,
    "1e-5": 76.5,
    "1e-4": 71.8
  },
  "request_id": "1469761507,07174361-027c-46e1-811f-ba0909760b18"
}
```

## Sample Error Response
```json
{
  "time_used": 5,
  "error_message": "INVALID_FACE_TOKEN:c2fc0ad7c8da3af5a34b9c70ff764da0",
  "request_id": "1469761051,ec285c20-8660-47d3-8b91-5dc2bffa0049"
}
```

## Error Messages

### Unique Errors

| Status | Error Message | Description |
|--------|----------------|-------------|
| 400 | `INVALID_FACE_TOKEN:<face_token>` | Face token not found |
| 400 | `IMAGE_ERROR_UNSUPPORTED_FORMAT:<param>` | Image unreadable/unsupported |
| 400 | `INVALID_IMAGE_SIZE:<param>` | Image too large or small |
| 400 | `INVALID_IMAGE_URL:<param>` | Invalid image URL |
| 400 | `IMAGE_FILE_TOO_LARGE:<param>` | Image file > 2MB |
| 412 | `IMAGE_DOWNLOAD_TIMEOUT:<param>` | Image download timeout |

### Common Errors

| Status | Error | Description |
|--------|-------|-------------|
| 401 | `AUTHENTICATION_ERROR` | Invalid API key/secret |
| 403 | `AUTHORIZATION_ERROR:<reason>` | No permission to use API |
| 403 | `CONCURRENCY_LIMIT_EXCEEDED` | QPS limit exceeded |
| 400 | `MISSING_ARGUMENTS:<key>` | Required argument missing |
| 400 | `BAD_ARGUMENTS:<key>` | Invalid argument type or format |
| 400 | `COEXISTENCE_ARGUMENTS` | Conflicting parameters |
| 413 | `Request Entity Too Large` | Payload > 2MB |
| 404 | `API_NOT_FOUND` | API not found |
| 500 | `INTERNAL_ERROR` | Internal server error |

## Sample CURL Request
```bash
curl -X POST "https://api-us.faceplusplus.com/facepp/v3/compare" \
  -F "api_key=<api_key>" \
  -F "api_secret=<api_secret>" \
  -F "face_token1=c2fc0ad7c8da3af5a34b9c70ff764da0" \
  -F "face_token2=ad248a809408b6320485ab4de13fe6a9"
```
