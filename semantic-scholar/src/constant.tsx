export const conferences_list = [
  "Neural Information Processing Systems",
  "International Conference on Machine Learning",
  "International Conference on Learning Representations",
  "AAAI Conference on Artificial Intelligence",
  "Journal of Machine Learning Research",
  // "International Joint Conference on Artificial Intelligence",
  // "ACM Multimedia",
  "Knowledge Discovery and Data Mining",
  "Conference on Empirical Methods in Natural Language Processing",
  "Annual Meeting of the Association for Computational Linguistics",
  "North American Chapter of the Association for Computational Linguistics",
  "Computer Vision and Pattern Recognition",
  "European Conference on Computer Vision",
  "IEEE International Conference on Computer Vision",
  "IEEE Transactions on Pattern Analysis and Machine Intelligence",
  "Annual International ACM SIGIR Conference on Research and Development in Information Retrieval",
];

export const abbreviations: { [key: string]: string } = {
  "Neural Information Processing Systems": "NeurIPS",
  "International Conference on Machine Learning": "ICML",
  "International Conference on Learning Representations": "ICLR",
  "AAAI Conference on Artificial Intelligence": "AAAI",
  "Journal of Machine Learning Research": "JMLR",
  "International Joint Conference on Artificial Intelligence": "IJCAI",
  "ACM Multimedia": "ACM MM",
  "Knowledge Discovery and Data Mining": "KDD",
  "Conference on Empirical Methods in Natural Language Processing": "EMNLP",
  "Annual Meeting of the Association for Computational Linguistics": "ACL",
  "North American Chapter of the Association for Computational Linguistics":
    "NAACL",
  "Computer Vision and Pattern Recognition": "CVPR",
  "European Conference on Computer Vision": "ECCV",
  "IEEE International Conference on Computer Vision": "ICCV",
  "IEEE Transactions on Pattern Analysis and Machine Intelligence": "TPAMI",
  "Annual International ACM SIGIR Conference on Research and Development in Information Retrieval":
    "SIGIR",
  "IEEE Workshop/Winter Conference on Applications of Computer Vision": "WACV",
  "Conference of the European Chapter of the Association for Computational Linguistics":
    "EACL",
  "IEEE Transactions on Knowledge and Data Engineering": "TKDE",
  // Robotics
  "Conference on Robot Learning": "CoRL",
  "IEEE International Conference on Robotics and Automation": "ICRA",
  "IEEE Transactions on Robotics": "TRO",
  "Robotics: Science and Systems": "RSS",
};

let lowercase_abbreviations: { [key: string]: string } = {};

export function getConferenceAbbreviation(venue: string) {
  if (Object.keys(lowercase_abbreviations).length === 0) {
    Object.keys(abbreviations).forEach((key) => {
      lowercase_abbreviations[key.toLowerCase()] = abbreviations[key];
    });
  }

  let cvpr_string: string =
    "IEEE/CVF Conference on Computer Vision and Pattern Recognition";
  if (venue.toLowerCase() in lowercase_abbreviations) {
    return lowercase_abbreviations[venue.toLowerCase()];
  } else if (venue.includes(cvpr_string)) {
    return "CVPR";
  } else {
    return "";
  }
}
