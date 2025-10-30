using System;

namespace Art.Fish
{
    /// <summary>
    /// Raw payload representation received from the fish backend.
    /// </summary>
    [Serializable]
    public sealed class FishDto
    {
        public string id;
        public string imageUrl;
        public string color;
        public string createdAt;
    }
}