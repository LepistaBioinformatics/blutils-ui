import { CopyToClipboard } from "@/components/CopyToClipBoard";
import { kebabToPlain } from "@/functions/kebab-to-plain";
import { kebabToSciname } from "@/functions/kebab-to-scientific-name";
import { Result } from "@/types/BlutilsResult";
import { Modal } from "flowbite-react";

interface Props {
  result: Result | undefined;
  openModal: boolean;
  setOpenModal: () => void;
}

export function ConsensusModal({ result, openModal, setOpenModal }: Props) {
  return !result ? null : (
    <Modal show={openModal} onClose={() => setOpenModal()}>
      <Modal.Header>{result.query}</Modal.Header>
      <Modal.Body>
        <div className="m-1">
          {result?.taxon?.consensusBeans.map((item, index) => {
            const sciName = kebabToSciname(item.identifier, item.rank);

            return (
              <div
                key={index}
                className="p-4 border-t border-gray-500 shadow bg-gray-100 dark:bg-gray-800 text-gray-100"
              >
                <div className="flex justify-between mb-5 text-2xl">
                  <div className="group">
                    <span>
                      {sciName}
                      <CopyToClipboard
                        text={sciName.props.children}
                        className="mx-2 mb-1 text-white"
                      />
                    </span>
                    <span className="text-sm text-gray-500">
                      {kebabToPlain(item.rank)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 mr-1">x</span>
                    <span>{item.occurrences}</span>
                  </div>
                </div>
                <div className="max-h-[150px] overflow-auto">
                  <div className="text-gray-500 mr-2 group">
                    Accessions
                    <CopyToClipboard
                      text={item.accessions.join(" ")}
                      className="ml-3 mb-1 text-white text-lg"
                    />
                  </div>
                  <div className="flex flex-wrap text-gray-400">
                    {item.accessions.map((acc, index) => (
                      <div key={index} className="mr-3">
                        {acc}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Modal.Body>
    </Modal>
  );
}
