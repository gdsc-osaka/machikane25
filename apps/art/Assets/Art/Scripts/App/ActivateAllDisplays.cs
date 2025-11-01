using UnityEngine;

namespace Art.App
{
    public class ActivateAllDisplays : MonoBehaviour
    {
        void Start()
        {
            // Display.displays[0] はプライマリディスプレイで常にONです。
            // 2つ目以降のディスプレイを有効化します。
            for (int i = 1; i < Display.displays.Length; i++)
            {
                Display.displays[i].Activate();
            }
        }
    }
}