import { calculatePoints } from "./draftUtils";
import Modal from 'react-modal';

export function PlayerModal({ player, isOpen, close, button, zIndex}) {
    if (!player) return null;

    const data = calculatePoints(player.name);
    
    const modalStyles = {
        content: {
            top: '50%',
            left: '50%',
            right: 'auto',
            bottom: 'auto',
            marginRight: '-50%',
            transform: 'translate(-50%, -50%)',
            borderRadius: '16px',
            border: 'none',
            padding: '24px',
            maxWidth: '90%',
            width: '400px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        },
        overlay: { backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: zIndex }
    };

    var wideimage; 
    if (Math.floor(Math.random() * 20) == 0){
        wideimage = "w-500 h-30 mx-auto my-4 rounded-full border-4 border-slate-100 shadow-inner bg-radial via-yellow-400 to-orange-700";
    } 
    else{
        wideimage = "w-36 h-30 mx-auto my-4 rounded-full border-4 border-slate-100 shadow-inner bg-radial via-yellow-400 to-orange-700";
    }

    return (
        <Modal isOpen={isOpen} style={modalStyles} onRequestClose={close} closeTimeoutMS={200}>
            <div className="relative">
                <button onClick={close} className="absolute -top-2 -right-2 text-slate-400 hover:text-slate-600 font-bold">✕</button>
                
                <div className="text-center mb-4">
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">{player.name}</h2>
                    <h3 className="font-black text-slate-800 uppercase tracking-tight">{player.team} | {player.position}</h3>
                    <img src={player.headshot} className={wideimage} alt={player.name} />
                </div>

                {button ? button : undefined}

                <div className="max-h-[400px] overflow-auto rounded-lg border border-slate-200">
                    <table className="w-full text-sm text-center border-collapse">
                        <thead className="bg-slate-50 sticky top-0">
                            <tr>
                                <th className="p-3 border-b border-slate-200 font-bold text-slate-600">Week</th>
                                <th className="p-3 border-b border-slate-200 font-bold text-slate-600">Points</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.map((points, index) => (
                                <tr key={index} className="hover:bg-blue-50 transition-colors even:bg-slate-50/50">
                                    <td className="p-3 text-slate-500 font-medium">{index + 1}</td>
                                    <td className="p-3 font-bold text-slate-800">{points}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </Modal>
    );
}