/**
 * 방 이동 약도 렌더링
 * @param {Object} map - { nodes, edges }
 * @param {string} currentRoom - 현재 방 id
 * @param {Object[]} rooms - 방 객체 배열
 * @returns {string} HTML
 */
export function renderMapWidget(map, currentRoom, rooms) {
  const roomNames = {};
  rooms.forEach(r => { roomNames[r.id] = r.name; });

  const nodeHtml = map.nodes.map(nodeId => {
    const isCurrent = nodeId === currentRoom;
    return `<span class="map-node ${isCurrent ? 'map-node--current' : ''}">${roomNames[nodeId] || nodeId}</span>`;
  }).join(' — ');

  return `<div class="map-widget">${nodeHtml}</div>`;
}
