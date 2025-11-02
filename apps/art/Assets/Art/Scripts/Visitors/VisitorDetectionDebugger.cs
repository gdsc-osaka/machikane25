using System.Collections.Generic;
using UnityEngine;

namespace Art.Visitors
{
    /// <summary>
    /// Optional gizmo overlay that visualises current visitor centroids in the scene view.
    /// </summary>
    [RequireComponent(typeof(VisitorDetector))]
    public sealed class VisitorDetectionDebugger : MonoBehaviour
    {
        [SerializeField] private bool overlayEnabled;
        [SerializeField] private Color gizmoColor = new Color(0.1f, 0.8f, 1f, 0.6f);
        [SerializeField] private float gizmoRadius = 0.25f;
        [SerializeField] private float gizmoHeight = 0.5f;

        private readonly List<VisitorGroup> latestVisitors = new List<VisitorGroup>();
        private VisitorDetector detector;

        private void Awake()
        {
            detector = GetComponent<VisitorDetector>();
        }

        private void OnEnable()
        {
            if (detector != null)
            {
                detector.OnVisitorsChanged += HandleVisitorsChanged;
            }
        }

        private void OnDisable()
        {
            if (detector != null)
            {
                detector.OnVisitorsChanged -= HandleVisitorsChanged;
            }

            latestVisitors.Clear();
        }

        private void HandleVisitorsChanged(IReadOnlyList<VisitorGroup> visitors)
        {
            latestVisitors.Clear();
            if (visitors == null)
            {
                return;
            }

            for (var i = 0; i < visitors.Count; i++)
            {
                latestVisitors.Add(visitors[i]);
            }
        }

        private void OnDrawGizmos()
        {
            if (!overlayEnabled || latestVisitors.Count == 0)
            {
                return;
            }

            Gizmos.color = gizmoColor;
            for (var i = 0; i < latestVisitors.Count; i++)
            {
                var position = latestVisitors[i].Position;
                var world = new Vector3(position.x, gizmoHeight, position.y);
                Gizmos.DrawSphere(world, gizmoRadius);
            }
        }
    }
}
