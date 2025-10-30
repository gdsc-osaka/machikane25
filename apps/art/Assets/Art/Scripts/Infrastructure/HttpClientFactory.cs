using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Networking;

namespace Art.Infrastructure
{
    public interface IHttpClient
    {
        IEnumerator Get(string url, IReadOnlyDictionary<string, string> headers, Action<HttpResponse> onComplete);
    }

    public sealed class HttpResponse
    {
        public long StatusCode { get; set; }
        public bool IsNetworkError { get; set; }
        public string Error { get; set; }
        public string Body { get; set; }
        public Dictionary<string, string> Headers { get; set; } = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        public bool IsSuccessStatusCode => StatusCode >= 200 && StatusCode <= 299 && !IsNetworkError;
    }

    public static class HttpClientFactory
    {
        private sealed class UnityHttpClient : IHttpClient
        {
            public IEnumerator Get(string url, IReadOnlyDictionary<string, string> headers, Action<HttpResponse> onComplete)
            {
                UnityWebRequest request = null;
                try
                {
                    request = UnityWebRequest.Get(url);
                }
                catch (Exception ex)
                {
                    onComplete?.Invoke(new HttpResponse
                    {
                        StatusCode = 0,
                        IsNetworkError = true,
                        Error = $"Failed to create request: {ex.Message}"
                    });
                    yield break;
                }

                using (request)
                {
                    if (headers != null)
                    {
                        foreach (var kvp in headers)
                        {
                            if (!string.IsNullOrEmpty(kvp.Key) && kvp.Value != null)
                            {
                                request.SetRequestHeader(kvp.Key, kvp.Value);
                            }
                        }
                    }

                    yield return request.SendWebRequest();

#if UNITY_2020_2_OR_NEWER
                    var result = request.result;
                    var isNetworkError = result == UnityWebRequest.Result.ConnectionError || result == UnityWebRequest.Result.ProtocolError;
#else
                    var isNetworkError = request.isNetworkError || request.isHttpError;
#endif

                    var response = new HttpResponse
                    {
                        StatusCode = request.responseCode,
                        IsNetworkError = isNetworkError,
                        Error = request.error,
                        Body = request.downloadHandler != null ? request.downloadHandler.text : null,
                        Headers = request.GetResponseHeaders() ?? new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
                    };

                    onComplete?.Invoke(response);
                }
            }
        }

        private static IHttpClient sharedClient;

        public static IHttpClient Create()
        {
            if (sharedClient == null)
            {
                sharedClient = new UnityHttpClient();
            }

            return sharedClient;
        }
    }
}