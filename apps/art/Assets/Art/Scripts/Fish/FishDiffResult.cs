using System;
using System.Collections.Generic;

namespace Art.Fish
{
    /// <summary>
    /// Captures the changes produced by a repository update.
    /// </summary>
    public sealed class FishDiffResult
    {
        public static readonly FishDiffResult Empty = new FishDiffResult(
            Array.Empty<FishState>(),
            Array.Empty<FishState>(),
            Array.Empty<string>());

        public IReadOnlyList<FishState> Added { get; }
        public IReadOnlyList<FishState> Updated { get; }
        public IReadOnlyList<string> Removed { get; }

        public FishDiffResult(IReadOnlyList<FishState> added, IReadOnlyList<FishState> updated, IReadOnlyList<string> removed)
        {
            Added = added ?? new List<FishState>(0);
            Updated = updated ?? new List<FishState>(0);
            Removed = removed ?? new List<string>(0);
        }
    }
}