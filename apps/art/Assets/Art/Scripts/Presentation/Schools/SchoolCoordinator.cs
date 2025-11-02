using Art.Fish;
using Art.Visitors;
using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.Controls;

namespace Art.Presentation.Schools
{
    /// <summary>
    /// Central coordination point for fish agents participating in the boids simulation.
    /// </summary>
    public sealed class SchoolCoordinator : MonoBehaviour
    {
        [SerializeField] private BoidSettings settings;
        [SerializeField] private VisitorInfluenceSettings visitorInfluence;
        [SerializeField] [Tooltip("Fish agents placed in the hierarchy to be automatically registered on startup.")]
        private FishAgent[] defaultFishAgents = Array.Empty<FishAgent>();
        [SerializeField] [Tooltip("Random noise range added to boid steering.")]
        private float noiseRange = 2.0f;

        private static readonly float[] KeyboardPositions =
        {
            0.05f,
            0.15f,
            0.25f,
            0.35f,
            0.45f,
            0.55f,
            0.65f,
            0.75f,
            0.85f,
            0.95f
        };

        private readonly HashSet<FishAgent> agents = new HashSet<FishAgent>();
        private readonly List<FishAgent> pruneScratch = new List<FishAgent>();
        private readonly List<FishAgent> agentScratch = new List<FishAgent>();
        private readonly Dictionary<FishAgent, Vector3> velocities = new Dictionary<FishAgent, Vector3>();
        private Vector2? keyboardTargetNormalized;
        private Vector3? keyboardTargetWorld;
        private float keyboardInfluenceWeight;
        private IReadOnlyList<VisitorGroup> currentVisitors = Array.Empty<VisitorGroup>();

        public IReadOnlyCollection<FishAgent> ActiveAgents => agents;

        public BoidSettings Settings => settings;

        public VisitorInfluenceSettings VisitorInfluence => visitorInfluence;

        public void SetSettings(BoidSettings newSettings)
        {
            settings = newSettings;
            foreach (var agent in agents)
            {
                agent.Configure(settings);
            }
        }

        public void SetVisitorInfluence(VisitorInfluenceSettings settingsAsset)
        {
            visitorInfluence = settingsAsset;
        }

        public void RegisterAgent(FishAgent agent)
        {
            if (agent == null)
            {
                return;
            }

            if (agents.Add(agent))
            {
                agent.Configure(settings);
                velocities[agent] = InitialVelocity(agent.transform);
                agent.ApplyVisitorSteering(Vector3.zero);
            }
        }

        public void RemoveAgent(FishAgent agent)
        {
            if (agent == null)
            {
                return;
            }
            if (agents.Remove(agent))
            {
                velocities.Remove(agent);
            }
        }

        public void ApplyVisitorInfluence(IReadOnlyList<VisitorGroup> visitors)
        {
            currentVisitors = visitors ?? Array.Empty<VisitorGroup>();
        }

        private void Awake()
        {
            RegisterDefaultFishAgents();
        }

        private void Update()
        {
            UpdateKeyboardTarget(Time.deltaTime);
            UpdateAgents();
        }

        private void RegisterDefaultFishAgents()
        {
            if (defaultFishAgents == null || defaultFishAgents.Length == 0)
            {
                return;
            }

            foreach (var fishAgent in defaultFishAgents)
            {
                if (fishAgent != null)
                {
                    RegisterAgent(fishAgent);
                }
            }
        }

        private void UpdateAgents()
        {
            if (agents.Count == 0 || settings == null)
            {
                return;
            }

            pruneScratch.Clear();
            agentScratch.Clear();

            foreach (var agent in agents)
            {
                if (agent == null)
                {
                    pruneScratch.Add(agent);
                    continue;
                }

                agentScratch.Add(agent);
            }

            if (pruneScratch.Count > 0)
            {
                foreach (var stale in pruneScratch)
                {
                    agents.Remove(stale);
                    velocities.Remove(stale);
                }

                pruneScratch.Clear();
            }

            if (agentScratch.Count == 0)
            {
                return;
            }

            var deltaTime = Time.deltaTime;
            var neighbourRadius = settings.NeighbourRadius;
            var neighbourRadiusSq = neighbourRadius * neighbourRadius;
            var avoidanceRadius = settings.AvoidanceRadius;
            var avoidanceRadiusSq = avoidanceRadius * avoidanceRadius;

            for (var i = 0; i < agentScratch.Count; i++)
            {
                var agent = agentScratch[i];
                var controller = agent.GetComponent<FishController>();
                if (controller == null)
                {
                    continue;
                }

                var position = controller.transform.position;
                var currentVelocity = GetVelocity(agent, controller);

                var cohesion = Vector3.zero;
                var alignment = Vector3.zero;
                var separation = Vector3.zero;
                var neighbourCount = 0;

                for (var j = 0; j < agentScratch.Count; j++)
                {
                    if (i == j)
                    {
                        continue;
                    }

                    var otherAgent = agentScratch[j];
                    var otherController = otherAgent.GetComponent<FishController>();
                    if (otherController == null)
                    {
                        continue;
                    }

                    var otherPosition = otherController.transform.position;
                    var offset = otherPosition - position;
                    var sqrDistance = offset.sqrMagnitude;

                    if (sqrDistance <= Mathf.Epsilon || sqrDistance > neighbourRadiusSq)
                    {
                        continue;
                    }

                    neighbourCount++;
                    cohesion += otherPosition;
                    alignment += GetVelocity(otherAgent, otherController);

                    if (sqrDistance < avoidanceRadiusSq)
                    {
                        var pushDirection = position - otherPosition;
                        var distance = Mathf.Sqrt(sqrDistance);
                        separation += pushDirection.normalized / Mathf.Max(0.01f, distance);
                    }
                }

                var steering = Vector3.zero;

                if (neighbourCount > 0)
                {
                    var averagePosition = cohesion / neighbourCount;
                    var cohesionVector = (averagePosition - position);
                    if (cohesionVector.sqrMagnitude > 0f)
                    {
                        steering += cohesionVector.normalized * settings.CohesionWeight;
                    }

                    var averageVelocity = alignment / neighbourCount;
                    if (averageVelocity.sqrMagnitude > 0f)
                    {
                        steering += averageVelocity.normalized * settings.AlignmentWeight;
                    }
                }

                if (separation.sqrMagnitude > 0f)
                {
                    steering += separation * settings.SeparationWeight;
                }

                if (noiseRange > 0f && settings.NoiseWeight > 0f)
                {
                    var noiseVector = UnityEngine.Random.insideUnitSphere * noiseRange;
                    steering += noiseVector.normalized * settings.NoiseWeight;
                }

                var visitorSteering = ComputeVisitorSteering(agent, position, deltaTime);
                if (visitorSteering.sqrMagnitude > 0f)
                {
                    steering += visitorSteering * settings.TargetAttractionWeight;
                }

                steering = Vector3.ClampMagnitude(steering, settings.MaxSteeringForce);

                var newVelocity = currentVelocity + steering * deltaTime;
                var newSpeed = newVelocity.magnitude;

                if (newSpeed < 0.001f)
                {
                    newVelocity = InitialVelocity(controller.transform);
                    newSpeed = newVelocity.magnitude;
                }

                newSpeed = Mathf.Clamp(newSpeed, settings.MinSpeed, settings.MaxSpeed);
                newVelocity = newVelocity.normalized * newSpeed;

                velocities[agent] = newVelocity;
                controller.SetBoidVelocity(newVelocity);
            }
        }

        private void UpdateKeyboardTarget(float deltaTime)
        {
            if (visitorInfluence == null)
            {
                keyboardTargetNormalized = null;
                keyboardTargetWorld = null;
                keyboardInfluenceWeight = 0f;
                return;
            }

            if (TryGetKeyboardSelection(out var x))
            {
                keyboardTargetNormalized = new Vector2(x, 0.5f);
                keyboardInfluenceWeight = Mathf.MoveTowards(keyboardInfluenceWeight, 1f, deltaTime * visitorInfluence.SteeringResponsiveness);
            }
            else
            {
                keyboardInfluenceWeight = Mathf.MoveTowards(keyboardInfluenceWeight, 0f, deltaTime * visitorInfluence.AbsenceDamping);
                if (keyboardInfluenceWeight <= 0.001f)
                {
                    keyboardTargetNormalized = null;
                }
            }

            keyboardTargetWorld = keyboardTargetNormalized.HasValue
                ? visitorInfluence.ToWorldPosition(keyboardTargetNormalized.Value)
                : (Vector3?)null;
        }

        private Vector3 ComputeVisitorSteering(FishAgent agent, Vector3 position, float deltaTime)
        {
            if (visitorInfluence == null)
            {
                var damped = Vector3.MoveTowards(agent.GetVisitorSteering(), Vector3.zero, deltaTime * 3f);
                agent.ApplyVisitorSteering(damped);
                return damped;
            }

            var desired = Vector3.zero;

            if (currentVisitors != null)
            {
                for (var i = 0; i < currentVisitors.Count; i++)
                {
                    var visitor = currentVisitors[i];
                    var target = visitorInfluence.ToWorldPosition(visitor.Position);
                    var toTarget = target - position;
                    var distance = toTarget.magnitude;

                    if (distance <= Mathf.Epsilon)
                    {
                        continue;
                    }

                    var distanceFactor = Mathf.Clamp01(distance / visitorInfluence.MaxDistance);
                    var attraction = Mathf.Pow(1f - distanceFactor, visitorInfluence.FalloffPower);
                    var strength = Mathf.Max(visitorInfluence.MinimumMagnitude, visitor.Magnitude) * visitorInfluence.AttractionStrength;
                    desired += toTarget.normalized * (strength * attraction);
                }
            }

            if (keyboardTargetWorld.HasValue && keyboardInfluenceWeight > 0f)
            {
                var toKeyboard = keyboardTargetWorld.Value - position;
                var distance = toKeyboard.magnitude;
                if (distance > Mathf.Epsilon)
                {
                    var distanceFactor = Mathf.Clamp01(distance / visitorInfluence.MaxDistance);
                    var attraction = Mathf.Pow(1f - distanceFactor, visitorInfluence.FalloffPower);
                    desired += toKeyboard.normalized * (keyboardInfluenceWeight * visitorInfluence.AttractionStrength * attraction);
                }
            }

            var currentSteering = agent.GetVisitorSteering();
            Vector3 nextSteering;

            if (desired.sqrMagnitude > Mathf.Epsilon)
            {
                var responsiveness = Mathf.Max(0f, visitorInfluence.SteeringResponsiveness);
                var lerpFactor = responsiveness <= 0f ? 1f : Mathf.Clamp01(1f - Mathf.Exp(-responsiveness * deltaTime));
                nextSteering = Vector3.Lerp(currentSteering, desired, lerpFactor);
            }
            else
            {
                var damping = Mathf.Max(0.01f, visitorInfluence.AbsenceDamping);
                nextSteering = Vector3.MoveTowards(currentSteering, Vector3.zero, damping * deltaTime);
            }

            agent.ApplyVisitorSteering(nextSteering);
            return nextSteering;
        }

        private Vector3 GetVelocity(FishAgent agent, FishController controller)
        {
            if (velocities.TryGetValue(agent, out var stored) && stored.sqrMagnitude > 0.0001f)
            {
                return stored;
            }

            var forward = controller.transform.forward;
            var speed = Mathf.Clamp(controller.speed, settings.MinSpeed, settings.MaxSpeed);
            var fallback = forward.sqrMagnitude > 0f ? forward.normalized * speed : InitialVelocity(controller.transform);
            velocities[agent] = fallback;
            return fallback;
        }

        private Vector3 InitialVelocity(Transform reference)
        {
            var direction = UnityEngine.Random.insideUnitSphere;
            if (direction.sqrMagnitude < 0.001f)
            {
                direction = reference != null ? reference.forward : Vector3.forward;
            }

            direction.Normalize();
            var initialSpeed = settings != null
                ? Mathf.Lerp(settings.MinSpeed, settings.MaxSpeed, 0.5f)
                : 2f;
            return direction * initialSpeed;
        }

        private bool TryGetKeyboardSelection(out float normalizedX)
        {
            normalizedX = 0f;

            var keyboard = Keyboard.current;
            if (keyboard == null)
            {
                return false;
            }

            if (IsPressed(keyboard.digit1Key) || IsPressed(keyboard.numpad1Key))
            {
                normalizedX = KeyboardPositions[0];
                return true;
            }

            if (IsPressed(keyboard.digit2Key) || IsPressed(keyboard.numpad2Key))
            {
                normalizedX = KeyboardPositions[1];
                return true;
            }

            if (IsPressed(keyboard.digit3Key) || IsPressed(keyboard.numpad3Key))
            {
                normalizedX = KeyboardPositions[2];
                return true;
            }

            if (IsPressed(keyboard.digit4Key) || IsPressed(keyboard.numpad4Key))
            {
                normalizedX = KeyboardPositions[3];
                return true;
            }

            if (IsPressed(keyboard.digit5Key) || IsPressed(keyboard.numpad5Key))
            {
                normalizedX = KeyboardPositions[4];
                return true;
            }

            if (IsPressed(keyboard.digit6Key) || IsPressed(keyboard.numpad6Key))
            {
                normalizedX = KeyboardPositions[5];
                return true;
            }

            if (IsPressed(keyboard.digit7Key) || IsPressed(keyboard.numpad7Key))
            {
                normalizedX = KeyboardPositions[6];
                return true;
            }

            if (IsPressed(keyboard.digit8Key) || IsPressed(keyboard.numpad8Key))
            {
                normalizedX = KeyboardPositions[7];
                return true;
            }

            if (IsPressed(keyboard.digit9Key) || IsPressed(keyboard.numpad9Key))
            {
                normalizedX = KeyboardPositions[8];
                return true;
            }

            if (IsPressed(keyboard.digit0Key) || IsPressed(keyboard.numpad0Key))
            {
                normalizedX = KeyboardPositions[9];
                return true;
            }

            return false;
        }

        private static bool IsPressed(KeyControl key)
        {
            return key != null && key.isPressed;
        }

    }
}
